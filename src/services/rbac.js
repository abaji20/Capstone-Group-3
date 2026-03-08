import { supabase } from '../supabaseClient';

export const getUserRole = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error("Error fetching role:", error);
    return null;
  }
  return data?.role;
};