import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MODULES } from '../config/permissions';
import './UserManagement.css';

const API_BASE_URL = process.env.REACT_APP_DOCUMENTS_API_URL || 'https://luminari-be.onrender.com';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'query_only',
    profession: '',
    department: '',
    organization: '',
    permissions: []
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      username: '',
      password: '',
      name: '',
      email: '',
      role: 'query_only',
      profession: '',
      department: '',
      organization: '',
      permissions: []
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name || '',
      email: user.email || '',
      role: user.role,
      profession: user.profession || '',
      department: user.department || '',
      organization: user.organization || '',
      permissions: user.permissions || []
    });
    setShowModal(true);
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_BASE_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
      console.error('Delete user error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('authToken');

      if (modalMode === 'create') {
        await axios.post(`${API_BASE_URL}/users`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await axios.put(`${API_BASE_URL}/users/${selectedUser.id}`, updateData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
      console.error('Save user error:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionsChange = (module) => {
    setFormData(prev => {
      const permissions = prev.permissions || [];
      if (permissions.includes(module)) {
        return { ...prev, permissions: permissions.filter(p => p !== module) };
      } else {
        return { ...prev, permissions: [...permissions, module] };
      }
    });
  };

  const roleDisplayNames = {
    'admin': 'Administrator',
    'full_access': 'Full Access',
    'protocol_only': 'Protocol Only',
    'regulatory_only': 'Regulatory Only',
    'query_only': 'Query Only',
    'diagnosis_only': 'Diagnosis Only',
    'custom': 'Custom Access'
  };

  if (loading) {
    return <div className="user-management-loading">Loading users...</div>;
  }

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h2>User Management</h2>
        <button onClick={handleCreateUser} className="btn-create-user">
          + Create New User
        </button>
      </div>

      {error && (
        <div className="user-management-error">
          {error}
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.name || '-'}</td>
                <td>{user.email || '-'}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {roleDisplayNames[user.role] || user.role}
                  </span>
                </td>
                <td>{user.department || '-'}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="btn-edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      className="btn-delete"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Create New User' : 'Edit User'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">×</button>
            </div>

            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    disabled={modalMode === 'edit'}
                  />
                </div>

                <div className="form-group">
                  <label>Password {modalMode === 'create' && '*'}</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={modalMode === 'create'}
                    placeholder={modalMode === 'edit' ? 'Leave blank to keep current' : ''}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="admin">Administrator</option>
                    <option value="full_access">Full Access</option>
                    <option value="protocol_only">Protocol Only</option>
                    <option value="regulatory_only">Regulatory Only</option>
                    <option value="query_only">Query Only</option>
                    <option value="diagnosis_only">Diagnosis Only</option>
                    <option value="custom">Custom Access</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Profession</label>
                  <input
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Organization</label>
                  <input
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {formData.role === 'custom' && (
                <div className="form-group">
                  <label>Custom Permissions</label>
                  <div className="permissions-grid">
                    {Object.values(MODULES).map(module => (
                      <label key={module} className="permission-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(module)}
                          onChange={() => handlePermissionsChange(module)}
                        />
                        <span>{module.replace('_', ' ').toUpperCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {modalMode === 'create' ? 'Create User' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
