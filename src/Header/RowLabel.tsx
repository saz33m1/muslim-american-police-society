'use client'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<{ label?: string }>()
  const n = data?.rowNumber !== undefined ? data.rowNumber + 1 : ''
  return <div>{data?.data?.label ? `${n}. ${data.data.label}` : 'Row'}</div>
}
