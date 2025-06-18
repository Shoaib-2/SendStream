import type { Subscriber } from '../types';

export const exportSubscribers = (subscribers: Subscriber[]) => {
  const csvContent = [
    ['ID', 'Email', 'Name', 'Status', 'Subscribed Date'], // Reordered columns, clear headers
    ...subscribers.map(subscriber => [
      subscriber.id,
      `"${subscriber.email}"`, // Wrap in quotes to handle potential commas
      `"${subscriber.name}"`, // Wrap in quotes to handle potential commas
      subscriber.status,
      new Date(subscriber.subscribed).toLocaleDateString('en-US') // Consistent date format
    ])
  ]
    .map(e => e.join(','))
    .join('\r\n'); // Use \r\n for better cross-platform compatibility

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'subscribers.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Function to import subscribers from a CSV file
export const importSubscribers = (file: File, addSubscriber: (subscriber: Subscriber) => void) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const csv = event.target?.result as string;
    const lines = csv.split('\n');
    const headers = lines[0].split(',');

    lines.slice(1).forEach(line => {
      const values = line.split(',');
      const subscriber = headers.reduce((obj, header, index) => {
        obj[header.trim()] = values[index].trim();
        return obj;
      }, {} as Record<string, string>);

      addSubscriber({
        id: crypto.randomUUID(),
        email: subscriber.Email,
        name: subscriber.Name,
        subscribed: new Date().toISOString(),
        status: subscriber.Status === 'active' || subscriber.Status === 'unsubscribed' ? subscriber.Status : 'active',
      });
    });
  };
  reader.readAsText(file);
};

// Function to remove a subscriber by ID
export const removeSubscriber = (id: string, subscribers: Subscriber[], setSubscribers: (subscribers: Subscriber[]) => void) => {
  const updatedSubscribers = subscribers.filter(subscriber => subscriber.id !== id);
  setSubscribers(updatedSubscribers);
};