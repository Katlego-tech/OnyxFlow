/** An empty screen is an invitation to act, so it always says what to do next. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="bg-card rounded-lg border border-dashed px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-sm">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}
