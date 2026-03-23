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
    published_date: metadata.published_date,
    category: metadata.category,
    description: metadata.description,
    image_url: imgPath,
    file_url: pdfPath 
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

export const checkDuplicate = async (title, author, fileName) => {
  const { data, error } = await supabase
    .from('pdfs')
    .select('id')
    .ilike('title', title)
    .ilike('author', author)
    .ilike('file_url', `%${fileName}`)
    .maybeSingle();

  if (error) throw error;
  return data;
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

/**
 * Fetches the top 5 most downloaded PDFs using a Supabase RPC.
 * This requires the 'get_most_downloaded_pdfs' function to be 
 * created in your Supabase SQL Editor.
 */
export const fetchFeaturedPdfs = async () => {
  const { data, error } = await supabase.rpc('get_most_downloaded_pdfs');
  if (error) {
    console.error("Error fetching spotlight PDFs:", error);
    return [];
  }
  return data || [];
};