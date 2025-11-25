"use client";
import { useState, useEffect } from 'react';
import { Trash2, Upload, Download, Search } from 'lucide-react';
import { exportSubscribers } from '../../../utils/csvHandler';
import { useData } from '../../../context/dataContext';
import { subscriberAPI } from '../../../services/api';
import { Subscriber } from '../../../types';
import Container from '@/components/UI/Container';
import Badge from '@/components/UI/Badge';

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
  const [role] = useState('admin');

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
      } catch {
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
    } catch {
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-5 sm:p-6 rounded-lg w-full max-w-md border border-gray-700 
          shadow-lg shadow-black/20 max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl sm:text-2xl font-bold mb-5">Add New Subscriber</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-medium text-sm text-gray-200">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-700/50 rounded-lg border border-gray-600
                  focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm
                  transition-colors duration-200"
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="block font-medium text-sm text-gray-200">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-700/50 rounded-lg border border-gray-600
                  focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm
                  transition-colors duration-200"
                placeholder="Enter name"
              />
              {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowSubscribeModal(false)}
                className="px-4 py-2.5 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors
                  text-sm font-medium min-w-[80px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors
                  text-sm font-medium min-w-[100px]"
              >
                Add Subscriber
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderActions = (subscriber: Subscriber) => (
    <div className="flex justify-center">
      <button
        onClick={() => removeSubscriber(subscriber.id)}
        className="text-gray-400 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
        aria-label="Delete subscriber"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="p-2 sm:p-4 md:p-6 min-h-screen">
      {isLoading ? (
        <div className="flex justify-center items-center h-[80vh]">
          <div className="w-12 h-12 md:w-16 md:h-16 relative">
            <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 blur-xl" />
          </div>
        </div>
      ) : (
        <Container size="xl" className="space-y-4">
          {showNotification && (
            <div className="fixed top-4 right-4 z-50 animate-fade-in">
              <Badge 
                variant={notificationType === 'success' ? 'success' : 'error'}
                size="lg"
                className="shadow-glow-lg"
              >
                {notificationMessage}
              </Badge>
            </div>
          )}

          <div className="flex flex-col space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <h1 className="text-2xl sm:text-3xl font-bold font-inter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                  Subscribers
                </h1>
                <span className="text-gray-400 font-inter text-lg sm:text-xl">({filteredSubscribers.length})</span>
              </div>
              
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowSubscribeModal(true)}
                  className="col-span-2 bg-blue-500 hover:bg-blue-600 px-4 py-2.5 rounded-lg font-medium
                    transform transition-all duration-200 hover:scale-[1.02] text-sm sm:text-base
                    flex items-center justify-center gap-2 min-w-[140px] sm:min-w-0"
                >
                  Add Subscriber
                </button>
                
                <label className="cursor-pointer bg-gray-800/50 hover:bg-gray-700/50 px-4 py-2.5 rounded-lg
                  flex items-center justify-center gap-2 backdrop-blur-sm border border-gray-700 hover:border-blue-500/50
                  transition-all duration-200 text-sm sm:text-base min-w-[120px]"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import</span>
                  <input type="file" className="hidden" accept=".csv" onChange={handleImport} />
                </label>
                
                <button
                  onClick={handleExport}
                  className="bg-gray-800/50 hover:bg-gray-700/50 px-4 py-2.5 rounded-lg
                    flex items-center justify-center gap-2 backdrop-blur-sm border border-gray-700 hover:border-blue-500/50
                    transition-all duration-200 text-sm sm:text-base min-w-[120px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                
                {role === 'admin' && selectedSubscribers.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="col-span-2 px-4 py-2.5 rounded-lg text-sm sm:text-base
                      bg-red-500/10 hover:bg-red-500/20 backdrop-blur-sm border border-red-500/50
                      transition-all duration-200 text-red-500 hover:text-red-400
                      flex items-center justify-center gap-2 min-w-[140px]"
                  >
                    <Trash2 className="w-4 h-4" />
                    Bulk Delete ({selectedSubscribers.length})
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search subscribers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800/50 rounded-lg
                  backdrop-blur-sm border border-gray-700 focus:border-blue-500/50
                  transition-all duration-200 pr-10 text-sm sm:text-base"
              />
              <Search className="absolute top-1/2 transform -translate-y-1/2 right-3 w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 
            hover:border-blue-500/50 transition-all duration-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-3 py-3 sm:px-4 md:px-6 text-left">
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
                        className="rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3 sm:px-4 md:px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3 sm:px-4 md:px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3 sm:px-4 md:px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Subscribed
                    </th>
                    <th className="px-3 py-3 sm:px-4 md:px-6 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 sm:px-4 md:px-6 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {currentSubscribers.length > 0 ? (
                    currentSubscribers.map((subscriber, index) => (
                      <tr key={subscriber.id || `subscriber-${index}`}
                        className="hover:bg-blue-500/5 transition-colors">
                        <td className="px-3 py-3 sm:px-4 md:px-6 whitespace-nowrap">
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
                            className="rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-3 sm:px-4 md:px-6 whitespace-nowrap">
                          <div className="flex flex-col sm:hidden mb-1">
                            <span className="text-sm font-medium">{subscriber.name}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(subscriber.subscribed).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="text-sm font-medium">{subscriber.email}</span>
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 sm:px-4 md:px-6 whitespace-nowrap text-gray-300 text-sm">
                          {subscriber.name}
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 sm:px-4 md:px-6 whitespace-nowrap text-gray-400 text-sm">
                          {new Date(subscriber.subscribed).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-3 sm:px-4 md:px-6 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            subscriber.status === 'active'
                              ? 'bg-green-500/10 text-green-500 border border-green-500/50'
                              : 'bg-red-500/10 text-red-400 border border-red-500/50'
                          }`}>
                            {subscriber.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 sm:px-4 md:px-6 whitespace-nowrap">
                          {renderActions(subscriber)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                        No subscribers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {filteredSubscribers.length > subscribersPerPage && (
            <div className="flex justify-center mt-4 gap-1.5 overflow-x-auto py-2">
              {Array.from({ length: Math.ceil(filteredSubscribers.length / subscribersPerPage) }).map((_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    key={`page-${pageNumber}`}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`min-w-[36px] h-[36px] flex items-center justify-center rounded-lg 
                      transition-all duration-200 text-sm ${
                      currentPage === pageNumber
                        ? 'bg-blue-500 text-white font-medium'
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
          )}

          {showSubscribeModal && <SubscribeModal />}
        </Container>
      )}
    </div>
  );
}