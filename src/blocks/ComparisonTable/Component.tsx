import React from 'react'

import type { ComparisonTableBlock as ComparisonTableBlockProps } from '@/payload-types'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

type Cell = NonNullable<NonNullable<ComparisonTableBlockProps['rows']>[number]['cells']>[number]

const CheckIcon: React.FC = () => (
  <svg aria-label="Yes" className="mx-auto size-5 text-primary" fill="none" role="img" viewBox="0 0 24 24">
    <path d="M5 12.5L10 17.5L19 7" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

const CrossIcon: React.FC = () => (
  <svg
    aria-label="No"
    className="mx-auto size-5 text-content-secondary/50"
    fill="none"
    role="img"
    viewBox="0 0 24 24"
  >
    <path d="M7 7L17 17M17 7L7 17" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

const CellContent: React.FC<{ cell?: Cell }> = ({ cell }) => {
  if (!cell) return null
  switch (cell.type) {
    case 'check':
      return <CheckIcon />
    case 'cross':
      return <CrossIcon />
    case 'text':
      return <span className="text-sm">{cell.text}</span>
    case 'image':
      return cell.image && typeof cell.image === 'object' ? (
        <Media className="mx-auto w-20" imgClassName="h-auto w-full" resource={cell.image} />
      ) : null
    default:
      return null
  }
}

/**
 * Comparison matrix: options across the top, features down the side, and a
 * check / cross / value / image in each cell. Horizontally scrollable on narrow
 * screens so the columns never crush.
 */
export const ComparisonTableBlock: React.FC<ComparisonTableBlockProps> = (props) => {
  const { columns, header, rows } = props

  const cols = columns || []
  const showHeader = header?.enableHeader && (header.heading || header.body)

  return (
    <section className="container" id={header?.anchorId || undefined}>
      {showHeader && (
        <div className="mb-12 max-w-2xl">
          {header?.heading && (
            <h2 className="type-h2">{header.heading}</h2>
          )}
          {header?.body && <RichText className="mt-4" data={header.body} enableGutter={false} />}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="p-4" />
              {cols.map((col, i) => (
                <th className="p-4 text-center align-bottom" key={i} scope="col">
                  {col.icon && typeof col.icon === 'object' && (
                    <Media
                      className="mx-auto mb-2 flex h-8 w-8 items-center justify-center"
                      imgClassName="h-8 w-auto object-contain"
                      resource={col.icon}
                    />
                  )}
                  <span className="font-semibold">{col.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row, i) => (
              <tr className="border-b border-border" key={i}>
                <th className="p-4 text-left font-medium" scope="row">
                  {row.label}
                </th>
                {cols.map((_, j) => (
                  <td className="p-4 text-center" key={j}>
                    <CellContent cell={row.cells?.[j]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
