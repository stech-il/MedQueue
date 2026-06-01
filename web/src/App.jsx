import { Routes, Route, Navigate } from 'react-router-dom';
import Kiosk from './pages/Kiosk';
import Display from './pages/Display';
import RoomStation from './pages/RoomStation';
import RoomStationRedirect from './pages/RoomStationRedirect';
import Home from './pages/Home';
import Login from './pages/Login';
import ManageLayout from './components/ManageLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ManageIndex from './components/ManageIndex';
import RoomsManage from './pages/manage/RoomsManage';
import UsersManage from './pages/manage/UsersManage';
import ClinicSettings from './pages/manage/ClinicSettings';
import ServicesManage from './pages/manage/ServicesManage';
import Stations from './pages/manage/Stations';
import Reports from './pages/manage/Reports';
import SystemStatus from './pages/manage/SystemStatus';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/kiosk" element={<Kiosk />} />
      <Route path="/display" element={<Display mode="lobby" />} />
      <Route path="/display/room/:roomId" element={<Display mode="room" />} />

      <Route path="/room" element={<RoomStationRedirect />} />
      <Route path="/room/:roomId" element={<RoomStation />} />

      <Route
        path="/manage"
        element={
          <ProtectedRoute>
            <ManageLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ManageIndex />} />
        <Route path="rooms" element={<AdminRoute><RoomsManage /></AdminRoute>} />
        <Route path="users" element={<AdminRoute><UsersManage /></AdminRoute>} />
        <Route path="settings" element={<AdminRoute><ClinicSettings /></AdminRoute>} />
        <Route path="services" element={<AdminRoute><ServicesManage /></AdminRoute>} />
        <Route path="reports" element={<AdminRoute><Reports /></AdminRoute>} />
        <Route path="status" element={<AdminRoute><SystemStatus /></AdminRoute>} />
        <Route path="stations" element={<Stations />} />
      </Route>

      <Route path="/admin" element={<Navigate to="/manage" replace />} />
      <Route path="/admin/*" element={<Navigate to="/manage" replace />} />
      <Route path="/settings/*" element={<Navigate to="/manage/rooms" replace />} />
    </Routes>
  );
}
