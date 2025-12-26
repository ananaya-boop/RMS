import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * JobRoleFilter - Search-enabled dropdown for filtering dashboard by job role
 * Positioned at top right of Pipeline Distribution section
 */
const JobRoleFilter = ({ jobs, selectedJob, onJobSelect, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter jobs based on search term
  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectJob = (job) => {
    onJobSelect(job);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = (e) => {
    e.stopPropagation();
    onJobSelect(null);
    setSearchTerm('');
  };

  const selectedJobTitle = selectedJob 
    ? jobs.find(j => j.id === selectedJob)?.title 
    : 'All Roles';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full min-w-[280px] px-4 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span className={`text-sm font-medium truncate ${
            selectedJob ? 'text-slate-900' : 'text-slate-600'
          }`}>
            {selectedJobTitle}
          </span>
          {selectedJob && (
            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full whitespace-nowrap">
              Filtered
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          {selectedJob && (
            <button
              onClick={handleClearSelection}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              title="Clear filter"
            >
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-full min-w-[320px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search job roles..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-[320px] overflow-y-auto">
            {/* All Roles Option */}
            <button
              onClick={() => handleSelectJob(null)}
              className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-slate-100 ${
                !selectedJob ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">All Roles</p>
                  <p className="text-xs text-slate-500 mt-0.5">View all candidates across all positions</p>
                </div>
                {!selectedJob && (
                  <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                )}
              </div>
            </button>

            {/* Job Options */}
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => handleSelectJob(job.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                    selectedJob === job.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{job.title}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-slate-500">{job.department}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">{job.location}</span>
                      </div>
                      {job.status && (
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                          job.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {job.status}
                        </span>
                      )}
                    </div>
                    {selectedJob === job.id && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full ml-3 flex-shrink-0"></div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-slate-500">No job roles found</p>
                <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          {filteredJobs.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'role' : 'roles'} available
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobRoleFilter;
