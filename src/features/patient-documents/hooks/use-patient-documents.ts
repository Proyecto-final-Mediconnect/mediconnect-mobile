import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { useSessionUser } from '../../auth/session';
import { fetchDocumentDownload, fetchMyDocuments, retireDocument, uploadDocument } from '../api';

/** Con el id de la sesión, como el resto: el próximo que ingrese no hereda la lista. */
function useDocumentsKey() {
  const { id } = useSessionUser();
  return ['patient-documents', id] as const;
}

export function useMyDocuments() {
  const queryKey = useDocumentsKey();
  return useQuery({ queryKey, queryFn: fetchMyDocuments });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const queryKey = useDocumentsKey();
  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useRetireDocument() {
  const queryClient = useQueryClient();
  const queryKey = useDocumentsKey();
  return useMutation({
    mutationFn: retireDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

/**
 * Pide la URL firmada y la abre en el navegador de la app, que muestra PDF e
 * imágenes sin nada más. La URL no se guarda en la caché: vence a los 5
 * minutos, y una vencida abriría un error de Supabase en lugar del documento.
 */
export function useOpenDocument() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { url } = await fetchDocumentDownload(id);
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch {
        // Sin Custom Tabs en Android: el navegador del sistema.
        await Linking.openURL(url);
      }
    },
  });
}
