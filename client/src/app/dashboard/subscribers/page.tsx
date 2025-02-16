"use client";
import { useState, useEffect } from 'react';
import { Trash2, Upload, Download, Search } from 'lucide-react';
import { exportSubscribers, importSubscribers } from '../../../utils/csvHandler';
import { useData } from '../../../context/dataContext';
import { subscriberAPI } from '../../../services/api';
import { Subscriber } from '../../../types';

export default function SubscribersPage() {
  const { subscribers, addSubscriber, removeSubscriber, isLoading} = useData();
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>(subscribers);
  const [currentPage, setCurrentPage] = useState(1);
  const [subscribersPerPage] = useState(10);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');
  const [role, setRole] = useState('admin');

  // Update filtered subscribers when search query or subscribers change
  useEffect(() => {
    const filtered = searchQuery
      ? subscribers.filter(subscriber =>
          subscriber.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          subscriber.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : subscribers;
    setFilteredSubscribers(filtered);
  }, [searchQuery, subscribers]);

  const handleExport = () => {
    exportSubscribers(subscribers);
    showNotificationMessage('Export successful', 'success');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await subscriberAPI.import(file);
        showNotificationMessage('Import successful', 'success');
      } catch (error) {
        showNotificationMessage('Import failed', 'error');
      }
    }
  };

  const handleBulkDelete = async () => {
    try {
      await subscriberAPI.bulkDelete(selectedSubscribers);
      // Update the filtered subscribers directly
      setFilteredSubscribers(prev => prev.filter(sub => !selectedSubscribers.includes(sub.id)));
      setSelectedSubscribers([]);
      showNotificationMessage('Bulk delete successful', 'success');
    } catch (error) {
      showNotificationMessage('Bulk delete failed', 'error');
    }
  };

  const showNotificationMessage = (message: string, type: string) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const indexOfLastSubscriber = currentPage * subscribersPerPage;
  const indexOfFirstSubscriber = indexOfLastSubscriber - subscribersPerPage;
  const currentSubscribers = filteredSubscribers.slice(indexOfFirstSubscriber, indexOfLastSubscriber);

  // Add new subscriber modal
  const SubscribeModal = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [errors, setErrors] = useState<{ email?: string; name?: string }>({});

    const validate = () => {
      const newErrors: { email?: string; name?: string } = {};
      if (!email) newErrors.email = 'Email is required';
      if (!name) newErrors.name = 'Name is required';
      return newErrors;
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      const newSubscriber: Omit<Subscriber, 'id'> = {
        email,
        name,
        status: 'active',
        subscribed: new Date().toISOString()
      };

      addSubscriber(newSubscriber);
      setShowSubscribeModal(false);
      showNotificationMessage('Subscriber added successfully', 'success');
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">Add New Subscriber</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                required
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
            </div>
            <div>
              <label className="block mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                required
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            </div>
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowSubscribeModal(false)}
                className="px-4 py-2 bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 rounded-lg"
              >
                Add Subscriber
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
  <div className="p-6">
    {isLoading ? (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    ) : (
      <>
      {showNotification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg ${notificationType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {notificationMessage}
        </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Subscribers</h1>
          <span className="text-gray-400">({filteredSubscribers.length})</span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowSubscribeModal(true)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Add Subscriber
          </button>
          <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import CSV
            <input type="file" className="hidden" accept=".csv" onChange={handleImport} />
          </label>
          <button onClick={handleExport} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          {role === 'admin' && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
              disabled={selectedSubscribers.length === 0}
            >
              Bulk Delete
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search subscribers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg pr-10"
          />
          <Search className="absolute top-1/2 transform -translate-y-1/2 right-3 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {showSubscribeModal && <SubscribeModal />}

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      const validIds = filteredSubscribers
                        .filter(sub => sub.id && typeof sub.id === 'string')
                        .map(sub => sub.id);
                      setSelectedSubscribers(validIds);
                    } else {
                      setSelectedSubscribers([]);
                    }
                  }}
                  checked={selectedSubscribers.length === filteredSubscribers.length && filteredSubscribers.length > 0}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Subscribed</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {currentSubscribers.map((subscriber, index) => (
              <tr key={subscriber.id || `subscriber-${index}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={selectedSubscribers.includes(subscriber.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSubscribers([...selectedSubscribers, subscriber.id]);
                      } else {
                        setSelectedSubscribers(selectedSubscribers.filter(id => id !== subscriber.id));
                      }
                    }}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{subscriber.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{subscriber.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {new Date(subscriber.subscribed).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{subscriber.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  <button onClick={() => removeSubscriber(subscriber.id)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center mt-4">
        {Array.from({ length: Math.ceil(filteredSubscribers.length / subscribersPerPage) }).map((_, index) => {
          const pageNumber = index + 1;
          return (
            <button
              key={`page-${pageNumber}`}
              onClick={() => handlePageChange(pageNumber)}
              className={`px-4 py-2 mx-1 rounded-lg ${currentPage === pageNumber ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              {pageNumber}
            </button>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}
    