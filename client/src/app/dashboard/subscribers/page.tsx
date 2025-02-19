"use client";
import { useState, useEffect } from 'react';
import { Trash2, Upload, Download, Search } from 'lucide-react';
import { exportSubscribers, importSubscribers } from '../../../utils/csvHandler';
import { useData } from '../../../context/dataContext';
import { subscriberAPI } from '../../../services/api';
import { Subscriber } from '../../../types';

export default function SubscribersPage() {
  const { subscribers, addSubscriber, removeSubscriber, isLoading } = useData();
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

  useEffect(() => {
    const filtered = searchQuery
      ? subscribers.filter(subscriber =>
          subscriber.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          subscriber.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : subscribers;
    setFilteredSubscribers(filtered);
  }, [searchQuery, subscribers]);

  const showNotificationMessage = (message: string, type: string) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
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

  const handleExport = () => {
    exportSubscribers(subscribers);
    showNotificationMessage('Export successful', 'success');
  };

  const handleBulkDelete = async () => {
    try {
      await subscriberAPI.bulkDelete(selectedSubscribers);
      setFilteredSubscribers(prev => prev.filter(sub => !selectedSubscribers.includes(sub.id)));
      setSelectedSubscribers([]);
      showNotificationMessage('Bulk delete successful', 'success');
    } catch (error) {
      showNotificationMessage('Bulk delete failed', 'error');
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const indexOfLastSubscriber = currentPage * subscribersPerPage;
  const indexOfFirstSubscriber = indexOfLastSubscriber - subscribersPerPage;
  const currentSubscribers = filteredSubscribers.slice(indexOfFirstSubscriber, indexOfLastSubscriber);

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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800/50 p-8 rounded-2xl w-full max-w-md border border-gray-700">
          <h2 className="text-2xl font-bold font-inter mb-6">Add New Subscriber</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600
                  focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block mb-2 font-medium">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600
                  focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                placeholder="Enter name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowSubscribeModal(false)}
                className="px-4 py-2 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
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
    <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50">
      {isLoading ? (
        <div className="flex justify-center items-center h-[80vh]">
          <div className="w-16 h-16 relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          {showNotification && (
            <div className={`fixed top-4 right-4 p-4 rounded-xl backdrop-blur-sm z-50 ${
              notificationType === 'success' 
                ? 'bg-green-500/10 border border-green-500/50 text-green-500' 
                : 'bg-red-500/10 border border-red-500/50 text-red-500'
            }`}>
              {notificationMessage}
            </div>
          )}

          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl md:text-4xl font-bold font-inter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                Subscribers
              </h1>
              <span className="text-gray-400 font-inter">({filteredSubscribers.length})</span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowSubscribeModal(true)}
                className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-medium
                  transform transition-all duration-300 hover:scale-105"
              >
                Add Subscriber
              </button>
              <label className="cursor-pointer bg-gray-800/50 hover:bg-gray-700/50 px-6 py-3 rounded-lg 
                flex items-center gap-2 backdrop-blur-sm border border-gray-700 hover:border-blue-500/50
                transition-all duration-300">
                <Upload className="w-4 h-4" />
                Import CSV
                <input type="file" className="hidden" accept=".csv" onChange={handleImport} />
              </label>
              <button 
                onClick={handleExport} 
                className="bg-gray-800/50 hover:bg-gray-700/50 px-6 py-3 rounded-lg flex items-center gap-2
                  backdrop-blur-sm border border-gray-700 hover:border-blue-500/50
                  transition-all duration-300"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              {role === 'admin' && (
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-500/10 hover:bg-red-500/20 px-6 py-3 rounded-lg
                    backdrop-blur-sm border border-red-500/50
                    transition-all duration-300 disabled:opacity-50
                    text-red-500 hover:text-red-400"
                  disabled={selectedSubscribers.length === 0}
                >
                  Bulk Delete
                </button>
              )}
            </div>
          </div>

          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Search subscribers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-3 bg-gray-800/50 rounded-xl
                backdrop-blur-sm border border-gray-700 focus:border-blue-500/50
                transition-all duration-300 pr-12"
            />
            <Search className="absolute top-1/2 transform -translate-y-1/2 right-4 w-5 h-5 text-gray-400" />
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden
            border border-gray-700 hover:border-blue-500/50 transition-all duration-300">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left">
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
                      className="rounded border-gray-600 text-blue-500 focus:ring-blue-500/50"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Subscribed</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {currentSubscribers.map((subscriber, index) => (
                  <tr key={subscriber.id || `subscriber-${index}`}
                    className="hover:bg-blue-500/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
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
                        className="rounded border-gray-600 text-blue-500 focus:ring-blue-500/50"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{subscriber.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{subscriber.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {new Date(subscriber.subscribed).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        subscriber.status === 'active' 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/50' 
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/50'
                      }`}>
                        {subscriber.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => removeSubscriber(subscriber.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors p-2
                          hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center mt-6 gap-2">
            {Array.from({ length: Math.ceil(filteredSubscribers.length / subscribersPerPage) }).map((_, index) => {
              const pageNumber = index + 1;
              return (
                <button
key={`page-${pageNumber}`}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                    currentPage === pageNumber
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>

          {showSubscribeModal && <SubscribeModal />}
        </div>
      )}
    </div>
  );
}

