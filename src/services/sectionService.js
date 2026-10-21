import { supabase } from '../supabaseClient';

export const fetchSections = async () => {
  const { data, error } = await supabase
    .from('library_sections')
    .select('name')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map((section) => section.name);
};

export const addSection = async (name) => {
  const cleanName = String(name || '').trim();
  if (!cleanName) throw new Error('Enter a section name.');

  const { error } = await supabase.from('library_sections').insert({ name: cleanName });
  if (error) throw error;
};

export const removeSection = async (name) => {
  const { error } = await supabase.from('library_sections').delete().eq('name', name);
  if (error) throw error;
};
