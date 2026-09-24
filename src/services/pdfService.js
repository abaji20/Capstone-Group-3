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
    .select('file_url, image_url')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  if (record.file_url) await supabase.storage.from('pdfs').remove([record.file_url]);
  if (record.image_url) await supabase.storage.from('pdfs').remove([record.image_url]);

  const { error: deleteError } = await supabase.from('pdfs').delete().eq('id', id);
  if (deleteError) throw deleteError;

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
  const { error } = await supabase
    .from('delete_requests')
    .insert([{ 
      pdf_id: pdfId, 
      reason: reason, 
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