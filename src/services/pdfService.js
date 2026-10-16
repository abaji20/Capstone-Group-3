import { supabase } from '../supabaseClient';

// --- EXISTING FEATURES ---

export const uploadPdfWithFiles = async (pdfFile, imageFile, metadata, userId) => {
  // 1. Upload PDF to storage
  const pdfPath = `pdfs/${Date.now()}_${pdfFile.name}`;
  const { error: pdfError } = await supabase.storage.from('pdfs').upload(pdfPath, pdfFile);
  if (pdfError) throw pdfError;

  // 2. Upload Cover Image to storage
  let imgPath = null;
  if (imageFile) {
    imgPath = `covers/${Date.now()}_${imageFile.name}`;
    const { error: imgError } = await supabase.storage.from('pdfs').upload(imgPath, imageFile);
    if (imgError) throw imgError;
  }

  // 3. Insert into PDFs table and capture the new ID
  const { data: newPdf, error: dbError } = await supabase.from('pdfs').insert([{
    title: metadata.title,
    author: metadata.author,
    genre: metadata.genre,
    published_date: metadata.published_date, // the YEAR
    // NEW: optional month (1-12) and day (1-31). NULL when not provided.
    published_month: metadata.published_month || null,
    published_day: metadata.published_day || null,
    category: metadata.category,
    description: metadata.description,
    image_url: imgPath,
    file_url: pdfPath,
    // NEW: digital-library metadata fields
    section: metadata.section || null,
    program_course: metadata.program_course || null,
    publisher: metadata.publisher || null,
    isbn: metadata.isbn || null,
    edition: metadata.edition || null,
    language: metadata.language || 'English',
  }]).select('id').single();

  if (dbError) throw dbError;

  // 4. Log the Upload action in audit_logs
  const { error: logError } = await supabase.from('audit_logs').insert([{
    user_id: userId,
    pdf_id: newPdf.id,
    action_type: 'Upload',
    description: `Uploaded new PDF: "${metadata.title}"`
  }]);

  if (logError) throw logError;

  return { success: true };
};

// --- DUPLICATE CHECK -----------------------------------------------------
// A document is a duplicate only when ALL of these match:
//   title + author + edition + ISBN
// Comparison ignores upper/lower case and extra spaces, and ISBNs are compared
// without dashes/spaces ("978-3-16" equals "978316"). An empty edition/ISBN only
// matches another empty one, so a "2nd Edition" is NOT a duplicate of a
// blank-edition record.
const norm = (v) => (v ?? '').toString().trim().toLowerCase();
const normIsbn = (v) => (v ?? '').toString().replace(/[\s-]/g, '').toLowerCase();

export const docKey = (d) =>
  [norm(d?.title), norm(d?.author), norm(d?.edition), normIsbn(d?.isbn)].join('|');

export const UPLOAD_REQUEST_DELETION_PREFIX = 'Your uploaded file has been deleted by: ';
export const LEGACY_UPLOAD_REQUEST_DELETION_PREFIX = 'Your request upload has been deleted by: ';
export const UPLOAD_REQUEST_RESTORATION_PREFIX = 'Your uploaded file has been restored by: ';

export const isUploadRequestDeleted = (remarks) =>
  remarks?.startsWith(UPLOAD_REQUEST_DELETION_PREFIX) ||
  remarks?.startsWith(LEGACY_UPLOAD_REQUEST_DELETION_PREFIX);

export const displayUploadRequestRemarks = (remarks) => {
  if (remarks?.startsWith(LEGACY_UPLOAD_REQUEST_DELETION_PREFIX)) {
    return `${UPLOAD_REQUEST_DELETION_PREFIX}Admin`;
  }
  return remarks;
};

export const setUploadRequestsDeleted = async (pdfs, user, deleted = true) => {
  const keys = new Set((pdfs || []).map(docKey).filter((key) => key !== '|||'));
  if (keys.size === 0) return;

  let remarks = null;
  if (deleted) {
    let deletedBy = 'Admin';
    if (user?.id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (profile?.role === 'admin') deletedBy = 'Admin';
      if (profile?.role === 'superadmin') deletedBy = 'Superadmin';
    }
    remarks = `${UPLOAD_REQUEST_DELETION_PREFIX}${deletedBy}`;
  }

  const { data: requests, error: requestsError } = await supabase
    .from('upload_requests')
    .select('id, client_id, title, author, edition, isbn, remarks')
    .eq('status', 'approved');
  if (requestsError) throw requestsError;

  const matchingRequests = (requests || [])
    .filter((request) => {
      const isRelatedPdf = keys.has(docKey(request));
      const hasDeletionMarker = request.remarks?.startsWith(UPLOAD_REQUEST_DELETION_PREFIX);
      return isRelatedPdf && (deleted ? !hasDeletionMarker : hasDeletionMarker);
    });

  if (matchingRequests.length === 0) return;

  const { error: updateError } = await supabase
    .from('upload_requests')
    .update({ remarks })
    .in('id', matchingRequests.map((request) => request.id));
  if (updateError) throw updateError;

  if (deleted) {
    const { error: notificationError } = await supabase
      .from('upload_request_notifications')
      .insert(matchingRequests.map((request) => ({
        user_id: request.client_id,
        upload_request_id: String(request.id),
        event_type: 'deleted',
        title: request.title,
        message: remarks,
      })));
    if (notificationError) throw notificationError;
  }
};

export const setUploadRequestsRestored = async (pdfs, user) => {
  const keys = new Set((pdfs || []).map(docKey).filter((key) => key !== '|||'));
  if (keys.size === 0) return;

  let restoredBy = 'Admin';
  if (user?.id) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role === 'superadmin') restoredBy = 'Superadmin';
  }

  const { data: requests, error: requestsError } = await supabase
    .from('upload_requests')
    .select('id, client_id, title, author, edition, isbn')
    .eq('status', 'approved');
  if (requestsError) throw requestsError;

  const matchingRequests = (requests || [])
    .filter((request) => keys.has(docKey(request)))
  if (matchingRequests.length === 0) return;

  const { error: updateError } = await supabase
    .from('upload_requests')
    .update({ remarks: `${UPLOAD_REQUEST_RESTORATION_PREFIX}${restoredBy}` })
    .in('id', matchingRequests.map((request) => request.id));
  if (updateError) throw updateError;

  const { error: notificationError } = await supabase
    .from('upload_request_notifications')
    .insert(matchingRequests.map((request) => ({
      user_id: request.client_id,
      upload_request_id: String(request.id),
      event_type: 'restored',
      title: request.title,
      message: `${UPLOAD_REQUEST_RESTORATION_PREFIX}${restoredBy}`,
    })));
  if (notificationError) throw notificationError;
};

export const checkDuplicate = async (title, author, edition = '', isbn = '') => {
  // Narrow down by title + author in the database, then compare edition and
  // ISBN here so blanks/NULLs and dashes are handled properly.
  const { data, error } = await supabase
    .from('pdfs')
    .select('*') 
    .ilike('title', title.trim())   
    .ilike('author', author.trim());

  if (error) {
    console.error("Duplicate check error:", error);
    throw error;
  }

  const target = docKey({ title, author, edition, isbn });
  return (data || []).find((row) => docKey(row) === target) || null;
};
export const deletePdf = async (id) => {
  const { data: record, error: fetchError } = await supabase
    .from('pdfs')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const { data: { user } } = await supabase.auth.getUser();
  if (record.file_url) await supabase.storage.from('pdfs').remove([record.file_url]);
  if (record.image_url) await supabase.storage.from('pdfs').remove([record.image_url]);

  const { error: deleteError } = await supabase.from('pdfs').delete().eq('id', id);
  if (deleteError) throw deleteError;

  await setUploadRequestsDeleted([record], user);

  return { success: true };
};

export const fetchPdfs = async () => {
  const { data, error } = await supabase
    .from('pdfs')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const submitDeleteRequest = async (pdfId, reason, userId) => {
  if (!userId) throw new Error('You must be signed in to request a deletion.');

  const { data: existingRequest, error: checkError } = await supabase
    .from('delete_requests')
    .select('id')
    .eq('pdf_id', pdfId)
    .eq('requested_by', userId)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  if (checkError) throw checkError;
  if (existingRequest) {
    throw new Error('You have already submitted a delete request for this document.');
  }

  const { error } = await supabase.from('delete_requests').insert([{
    pdf_id: pdfId,
    reason,
    status: 'pending',
    requested_by: userId
  }]);
  if (error) throw error;
  return { success: true };
};

export const uploadNewPdf = uploadPdfWithFiles;

// --- NEW FEATURE: DYNAMIC RANKING ---

export const fetchFeaturedPdfs = async () => {
  const { data, error } = await supabase.rpc('get_most_downloaded_pdfs');
  if (error) {
    console.error("Error fetching spotlight PDFs:", error);
    return [];
  }
  return (data || []).filter(pdf => !pdf.is_archived); // 👈 filter here
};