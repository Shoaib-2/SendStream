"use client";
import { useState, useEffect } from 'react';
import { Trash2, Upload, Download, Search } from 'lucide-react';
import { exportSubscribers } from '../../../utils/csvHandler';
import { useData } from '../../../context/dataContext';
import { subscriberAPI } from '../../../services/api';
import { Subscriber } from '../../../types';
import Container from '@/components/UI/Container';
import Card from '@/components/UI/Card';
import Badge from '@/components/UI/Badge';
import Button from '@/components/UI/Button';

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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="glass-strong p-5 sm:p-6 rounded-2xl w-full max-w-md border border-white/20 
          shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
          <h2 className="text-xl sm:text-2xl font-bold font-display gradient-text mb-5">Add New Subscriber</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block font-medium text-sm text-neutral-200">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-900/50 rounded-lg border border-neutral-700
                  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:outline-none text-sm
                  transition-all duration-200 text-white placeholder:text-neutral-500"
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-error-400 text-xs">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="block font-medium text-sm text-neutral-200">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-900/50 rounded-lg border border-neutral-700
                  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:outline-none text-sm
                  transition-all duration-200 text-white placeholder:text-neutral-500"
                placeholder="Enter name"
              />
              {errors.name && <p className="text-error-400 text-xs">{errors.name}</p>}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowSubscribeModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
              >
                Add Subscriber
              </Button>
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
        className="text-neutral-400 hover:text-error-400 transition-colors p-2 hover:bg-error-500/10 
          rounded-lg border border-transparent hover:border-error-500/30"
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
                className="shadow-glow-lg px-4 py-2"
              >
                {notificationMessage}
              </Badge>
            </div>
          )}

          <div className="flex flex-col space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <h1 className="text-2xl sm:text-3xl font-bold font-display gradient-text">
                  Subscribers
                </h1>
                <Badge variant="default" size="md">
                  {filteredSubscribers.length}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                <Button
                  variant="gradient"
                  onClick={() => setShowSubscribeModal(true)}
                  className="col-span-2"
                >
                  Add Subscriber
                </Button>
                
                <label className="cursor-pointer col-span-1">
                  <div className="w-full">
                    <Button
                      variant="secondary"
                      leftIcon={<Upload className="w-4 h-4" />}
                      className="w-full pointer-events-none"
                    >
                      Import
                    </Button>
                  </div>
                  <input type="file" className="hidden" accept=".csv" onChange={handleImport} />
                </label>
                
                <Button
                  variant="secondary"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleExport}
                  className="col-span-1"
                >
                  Export
                </Button>
                
                {role === 'admin' && selectedSubscribers.length > 0 && (
                  <Button
                    variant="danger"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={handleBulkDelete}
                    className="col-span-2"
                  >
                    Bulk Delete ({selectedSubscribers.length})
                  </Button>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search subscribers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 glass rounded-lg border border-white/10
                  focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50 transition-all duration-200 pr-10 text-sm sm:text-base
                  text-white placeholder:text-neutral-500"
              />
              <Search className="absolute top-1/2 transform -translate-y-1/2 right-3 w-4 h-4 text-neutral-400" />
            </div>
          </div>

          <Card variant="glass" padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-900/50">
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
                        className="rounded border-neutral-600 text-primary-500 focus:ring-primary-500/50 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3 sm:px-4 md:px-6 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3 sm:px-4 md:px-6 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3 sm:px-4 md:px-6 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Subscribed
                    </th>
                    <th className="px-3 py-3 sm:px-4 md:px-6 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 sm:px-4 md:px-6 text-center text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {currentSubscribers.length > 0 ? (
                    currentSubscribers.map((subscriber, index) => (
                      <tr key={subscriber.id || `subscriber-${index}`}
                        className="hover:bg-gradient-to-r hover:from-primary-500/5 hover:to-secondary-500/5 transition-all duration-300">
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
                            className="rounded border-neutral-600 text-primary-500 focus:ring-primary-500/50 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-3 sm:px-4 md:px-6 whitespace-nowrap">
                          <div className="flex flex-col sm:hidden mb-1">
                            <span className="text-sm font-medium text-white">{subscriber.name}</span>
                            <span className="text-xs text-neutral-400">
                              {new Date(subscriber.subscribed).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-white">{subscriber.email}</span>
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 sm:px-4 md:px-6 whitespace-nowrap text-neutral-300 text-sm">
                          {subscriber.name}
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 sm:px-4 md:px-6 whitespace-nowrap text-neutral-400 text-sm">
                          {new Date(subscriber.subscribed).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-3 sm:px-4 md:px-6 whitespace-nowrap">
                          <Badge 
                            variant={subscriber.status === 'active' ? 'success' : 'error'}
                            size="sm"
                          >
                            {subscriber.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 sm:px-4 md:px-6 whitespace-nowrap">
                          {renderActions(subscriber)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-neutral-400 text-sm">
                        No subscribers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {filteredSubscribers.length > subscribersPerPage && (
            <div className="flex justify-center mt-4 gap-1.5 overflow-x-auto py-2">
              {Array.from({ length: Math.ceil(filteredSubscribers.length / subscribersPerPage) }).map((_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    key={`page-${pageNumber}`}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`min-w-[36px] h-[36px] flex items-center justify-center rounded-lg 
                      transition-all duration-200 text-sm font-medium ${
                      currentPage === pageNumber
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
                        : 'glass text-neutral-400 hover:bg-white/10 border border-white/10'
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
