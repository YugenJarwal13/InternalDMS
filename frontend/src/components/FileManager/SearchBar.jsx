import { useState } from 'react';
import { HiSearch, HiFilter, HiX } from 'react-icons/hi';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const SearchBar = ({ type, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterParams, setFilterParams] = useState({
    ownerEmail: '',
    isFolder: null,
    createdAfter: null,
    createdBefore: null,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (type === 'search') {
      onSearch({ query: searchQuery });
    } else {
      onSearch(filterParams);
    }
  };

  const hasActiveFilters = filterParams.ownerEmail || 
                          filterParams.isFolder !== null || 
                          filterParams.createdAfter || 
                          filterParams.createdBefore;

  return (
    <div className="mb-6">
      <form onSubmit={handleSearch} className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            {type === 'search' ? (
              <div className="relative group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files by name..."
                  className="w-full px-5 py-3 border-2 rounded-xl pr-12 
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           transition-all duration-300 ease-in-out
                           placeholder-gray-400 text-gray-700
                           shadow-sm hover:shadow-md"
                  minLength={1}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-12 top-1/2 transform -translate-y-1/2
                             text-gray-400 hover:text-gray-600 transition-colors
                             focus:outline-none"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                )}
                <HiSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 
                                   text-gray-400 group-hover:text-blue-500
                                   transition-colors duration-300 w-6 h-6" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-5 py-3 bg-blue-50 text-blue-700 rounded-xl
                           hover:bg-blue-100 hover:shadow-md
                           transition-all duration-300 ease-in-out
                           flex items-center gap-2 font-medium
                           border-2 border-transparent hover:border-blue-200"
                >
                  <HiFilter className="w-5 h-5" />
                  <span>Filters</span>
                  {hasActiveFilters && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  )}
                </button>
                {hasActiveFilters && (
                  <span className="text-sm text-blue-600 font-medium px-3 py-1 bg-blue-50 rounded-full">
                    Active Filters
                  </span>
                )}
              </div>
            )}
          </div>
          {type === 'search' && (
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-xl
                       hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5
                       transition-all duration-300 ease-in-out font-medium
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Search
            </button>
          )}
        </div>

        {type === 'filter' && showFilters && (
          <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200 mt-3
                         transform transition-all duration-300 ease-in-out
                         hover:shadow-xl">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Owner Email
                </label>
                <input
                  type="email"
                  value={filterParams.ownerEmail}
                  onChange={(e) => setFilterParams({ ...filterParams, ownerEmail: e.target.value })}
                  placeholder="Filter by owner email..."
                  className="w-full px-4 py-2.5 border-2 rounded-lg
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           transition-all duration-300 ease-in-out placeholder-gray-400"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  value={filterParams.isFolder === null ? '' : filterParams.isFolder}
                  onChange={(e) => setFilterParams({ 
                    ...filterParams, 
                    isFolder: e.target.value === '' ? null : e.target.value === 'true' 
                  })}
                  className="w-full px-4 py-2.5 border-2 rounded-lg bg-white
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           transition-all duration-300 ease-in-out text-gray-700"
                >
                  <option value="">All Types</option>
                  <option value="true">Folders</option>
                  <option value="false">Files</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Created After
                </label>
                <DatePicker
                  selected={filterParams.createdAfter}
                  onChange={date => setFilterParams({ ...filterParams, createdAfter: date })}
                  className="w-full px-4 py-2.5 border-2 rounded-lg
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           transition-all duration-300 ease-in-out"
                  placeholderText="Select start date"
                  dateFormat="yyyy-MM-dd"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Created Before
                </label>
                <DatePicker
                  selected={filterParams.createdBefore}
                  onChange={date => setFilterParams({ ...filterParams, createdBefore: date })}
                  className="w-full px-4 py-2.5 border-2 rounded-lg
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           transition-all duration-300 ease-in-out"
                  placeholderText="Select end date"
                  dateFormat="yyyy-MM-dd"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setFilterParams({
                    ownerEmail: '',
                    isFolder: null,
                    createdAfter: null,
                    createdBefore: null,
                  });
                  onSearch(null);
                }}
                className="px-5 py-2.5 text-gray-600 hover:text-gray-800
                         hover:bg-gray-100 rounded-lg transition-colors duration-300
                         focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                Clear Filters
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5
                         transition-all duration-300 ease-in-out font-medium
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBar;
