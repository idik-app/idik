import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useMasterRuangan() {
  const { data, error, isLoading } = useSWR('/api/ruangan', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 menit
  });

  return {
    ruangan: data?.ruangan || [],
    isLoading,
    isError: error,
  };
}

export function useMasterVariants() {
  const { data, error, isLoading } = useSWR('/api/master-barang/variants', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 menit
  });

  return {
    items: data?.items || [],
    isLoading,
    isError: error,
  };
}

export function useMasterDoctors() {
  const { data, error, isLoading } = useSWR('/api/doctors', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 menit
  });

  return {
    doctors: data?.doctors || [],
    isLoading,
    isError: error,
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

  const { data, error, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 menit
  });

  return {
    pasien: data?.data || null,
    isLoading,
    isError: error,
  };
}

export function useTindakanDetail(id?: string | null) {
  const key = id ? `/api/tindakan/${encodeURIComponent(id)}` : null;
  const { data, error, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 1 menit
  });

  return {
    tindakan: data?.data || null,
    isLoading,
    isError: error,
  };
}
