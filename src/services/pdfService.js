import { supabase } from '../supabaseClient';

export const uploadPdfWithFiles = async (pdfFile, imageFile, metadata) => {
  const pdfPath = `pdfs/${Date.now()}_${pdfFile.name}`;
  const { error: pdfError } = await supabase.storage.from('pdfs').upload(pdfPath, pdfFile);
  if (pdfError) throw pdfError;

  let imgPath = null;
  if (imageFile) {
    imgPath = `covers/${Date.now()}_${imageFile.name}`;
    const { error: imgError } = await supabase.storage.from('pdfs').upload(imgPath, imageFile);
    if (imgError) throw imgError;
  }

  const { error: dbError } = await supabase.from('pdfs').insert([{
    title: metadata.title,
    author: metadata.author,
    genre: metadata.genre,
    published_date: metadata.published_date,
    description: metadata.description,
    image_url: imgPath,
    file_url: pdfPath 
  }]);

  if (dbError) throw dbError;
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

export const uploadNewPdf = uploadPdfWithFiles;

export const fetchPdfs = async () => {
  const { data, error } = await supabase
    .from('pdfs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Added this function and ensured it is exported so EditPDFs.jsx can see it
export const submitDeleteRequest = async (pdfId, reason, userId) => {
  const { error } = await supabase
    .from('delete_requests')
    .insert([{ 
      pdf_id: pdfId, 
      reason: reason, 
      status: 'pending',
      requested_by: userId // The service now captures the user's ID
    }]);
  
  if (error) throw error;
  return { success: true };
};