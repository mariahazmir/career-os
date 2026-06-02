import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (!context.auth.session) throw redirect({ to: '/login' })
    const role = context.auth.session.user.user_metadata?.role as string | undefined
    throw redirect({ to: role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard' })
  },
  component: () => null,
})
