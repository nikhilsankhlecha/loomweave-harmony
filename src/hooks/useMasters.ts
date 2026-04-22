import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useQualities = (active = true) =>
  useQuery({
    queryKey: ["qualities", active],
    queryFn: async () => {
      const q = supabase.from("qualities").select("*").order("quality_code");
      const { data, error } = active ? await q.eq("is_active", true) : await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useColoursByQuality = (qualityId?: string) =>
  useQuery({
    queryKey: ["colours", qualityId],
    enabled: !!qualityId,
    queryFn: async () => {
      const { data, error } = await supabase.from("colours").select("*").eq("quality_id", qualityId!).order("colour_code");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useLValuesByQuality = (qualityId?: string) =>
  useQuery({
    queryKey: ["lvalues", qualityId],
    enabled: !!qualityId,
    queryFn: async () => {
      const { data, error } = await supabase.from("l_values").select("*").eq("quality_id", qualityId!).order("l_code");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useWarehouses = () =>
  useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSuppliers = () =>
  useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCustomers = () =>
  useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });