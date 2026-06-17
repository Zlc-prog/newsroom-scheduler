import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Schedule } from './pages/schedule/Schedule';
import { Employees } from './pages/employees/Employees';
import { Department } from './pages/department/Department';
import { History } from './pages/history/History';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Schedule /> },
      { path: 'employees', element: <Employees /> },
      { path: 'department', element: <Department /> },
      { path: 'history', element: <History /> },
    ],
  },
]);
