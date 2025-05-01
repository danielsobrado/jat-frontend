import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import Settings from './Settings';
import { ApiClient } from '../api/types';
import { ClassificationForm } from './ClassificationForm';
import { HistoryTab } from './HistoryTab';
import BatchTab from './BatchTab/BatchTab';
import { BeakerIcon, DocumentTextIcon, ClockIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export interface MainTabsProps {
  apiClient: ApiClient;
}

export const MainTabs: React.FC<MainTabsProps> = ({ apiClient }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const tabs = [
    {
      name: 'Test',
      content: <ClassificationForm apiClient={apiClient} />,
      icon: BeakerIcon
    },
    {
      name: 'Batch',
      content: <BatchTab apiClient={apiClient} />,
      icon: DocumentTextIcon
    },
    {
      name: 'History',
      content: <HistoryTab apiClient={apiClient} />,
      icon: ClockIcon
    },
    {
      name: 'Settings',
      content: <Settings apiClient={apiClient} />,
      icon: Cog6ToothIcon
    },
  ];

  return (
    <div className="flex h-full bg-gray-50/50">
      <Tab.Group as="div" className="flex h-full w-full" vertical selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <Tab.List className="flex flex-col items-center gap-2 w-48 bg-white/80 backdrop-blur-sm shadow-sm py-6 px-3 m-4 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  classNames(
                    'group flex items-center w-40 gap-3 px-3 py-2 text-sm font-medium rounded-lg outline-none transition-all duration-200',
                    'focus:ring-1 focus:ring-offset-1 focus:ring-primary-200/30',
                    selected
                      ? 'text-primary-600 bg-primary-50/50 shadow-sm ring-1 ring-primary-100/50'
                      : 'text-secondary-400 hover:text-secondary-700 hover:bg-secondary-50/50 hover:shadow-sm'
                  )
                }
              >
                <Icon className={classNames(
                  'w-4 h-4 transition-all duration-200',
                  'group-hover:scale-105 group-hover:rotate-2'
                )} />
                {tab.name}
              </Tab>
            );
          })}
        </Tab.List>
        <Tab.Panels className="flex-1">
          {tabs.map((tab, idx) => (
            <Tab.Panel key={idx} className="h-full">
              <div className="h-full">
                {tab.content}
              </div>
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default MainTabs;