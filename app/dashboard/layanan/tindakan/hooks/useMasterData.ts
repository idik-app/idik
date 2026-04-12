import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const EMPTY_ARRAY: any[] = [];

export function useMasterRuangan() {
  const { data, error, isLoading, mutate } = useSWR('/api/ruangan', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 menit
  });

  return {
    ruangan: data?.ruangan || EMPTY_ARRAY,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useMasterVariants() {
  const { data, error, isLoading, mutate } = useSWR('/api/master-barang/variants', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 menit
  });

  return {
    items: data?.items || EMPTY_ARRAY,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useMasterDoctors() {
  const { data, error, isLoading, mutate } = useSWR('/api/doctors', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 menit
  });

  return {
    doctors: data?.doctors || EMPTY_ARRAY,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useMasterTindakan() {
  const { data, error, isLoading, mutate } = useSWR('/api/master-tindakan', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 menit
  });

  return {
    masterTindakan: data?.masterTindakan || EMPTY_ARRAY,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useMasterPerawat() {
  const { data, error, isLoading, mutate } = useSWR('/api/master-perawat', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 menit
  });

  return {
    perawat: data?.perawat || EMPTY_ARRAY,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useMasterTindakanKategori() {
  const { data, error, isLoading, mutate } = useSWR('/api/master-tindakan-kategori', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 menit
  });

  return {
    kategori: data?.kategori || EMPTY_ARRAY,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useMasterPasien() {
  const { data, error, isLoading, mutate } = useSWR('/api/pasien?compact=1&limit=1000', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000, // 10 menit
  });

  return {
    pasien: data?.data || EMPTY_ARRAY,
    isLoading,
    isError: error,
    mutate,
  };
}

export function usePasienDetail(id?: string | null, noRm?: string | null, nama?: string | null) {
  const key = id 
    ? `/api/pasien/${encodeURIComponent(id)}` 
    : noRm 
      ? `/api/pasien?noRm=${encodeURIComponent(noRm)}`
      : nama
        ? `/api/pasien?nama=${encodeURIComponent(nama)}`
        : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 menit
  });

  return {
    pasien: data?.data || null,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useTindakanDetail(id?: string | null) {
  const key = id ? `/api/tindakan/${encodeURIComponent(id)}` : null;
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 1 menit
  });

  return {
    tindakan: data?.data || null,
    isLoading,
    isError: error,
    mutate,
  };
}

export function usePemakaianOrders(tindakanId?: string | null) {
  const key = tindakanId ? `/api/pemakaian-orders?tindakanId=${encodeURIComponent(tindakanId)}` : '/api/pemakaian-orders?limit=1000';
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 10000, // 10 detik
  });

  return {
    orders: data?.orders || EMPTY_ARRAY,
    isLoading,
    isError: error,
    mutate,
  };
}
