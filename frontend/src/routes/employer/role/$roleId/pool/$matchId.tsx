import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/employer/role/$roleId/pool/$matchId')({
  component: () => <Outlet />,
})
