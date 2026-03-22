import { toast } from 'sonner'

import { HttpClient } from '@/lib/http/client'

export const http = new HttpClient(undefined, undefined, undefined, {
  toastError: (message) => {
    toast.error(message)
  },
})

export { HttpClient }
