import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { User, Mail, Calendar, Shield } from 'lucide-react';
import { formatDate, getInitials } from '../utils/helpers';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await authAPI.updateProfile({ name });
      updateUser(response.data.data);
      setMessage('Profile updated successfully');
    } catch (err) {
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (window.confirm('Are you sure you want to disconnect Gmail?')) {
      try {
        await authAPI.disconnectGmail();
        window.location.reload();
      } catch (err) {
        alert('Failed to disconnect Gmail');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Profile Settings</h1>

      {/* Profile Info Card */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-6">
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              className="w-20 h-20 rounded-full"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
              {getInitials(user?.name)}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{user?.name}</h2>
            <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {message && (
            <div className={`px-4 py-3 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {message}
            </div>
          )}

          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>

      {/* Account Details */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Account Details</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <Mail className="w-5 h-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
              <p className="font-medium">{formatDate(user?.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gmail Connection</p>
              <p className="font-medium">
                {user?.gmailConnected ? (
                  <span className="text-green-600">Connected</span>
                ) : (
                  <span className="text-red-600">Not Connected</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gmail Connection */}
      {user?.gmailConnected && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Gmail Integration</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your Gmail account is connected. We can automatically fetch and categorize your transaction emails.
          </p>
          <button onClick={handleDisconnectGmail} className="btn btn-danger">
            Disconnect Gmail
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
