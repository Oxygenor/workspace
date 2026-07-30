import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute, GuestOnlyRoute } from './ProtectedRoute'

import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import HomePage from '@/pages/app/HomePage'
import ItemPage from '@/pages/app/ItemPage'
import SearchPage from '@/pages/app/SearchPage'
import FavoritesPage from '@/pages/app/FavoritesPage'
import ArchivePage from '@/pages/app/ArchivePage'
import ProfilePage from '@/pages/app/settings/ProfilePage'
import WorkspaceSettingsPage from '@/pages/app/settings/WorkspaceSettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <GuestOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [{ path: '/reset-password', element: <ResetPasswordPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: 'home', element: <HomePage /> },
          { path: 'item/:itemId', element: <ItemPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'favorites', element: <FavoritesPage /> },
          { path: 'archive', element: <ArchivePage /> },
          { path: 'settings/profile', element: <ProfilePage /> },
          { path: 'settings/workspace', element: <WorkspaceSettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/app/home" replace /> },
  { path: '*', element: <NotFoundPage /> },
])
