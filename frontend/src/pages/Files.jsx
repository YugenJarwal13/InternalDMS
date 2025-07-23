import { useState } from 'react';
import { FileExplorer } from '../components/FileManager/FileExplorer';
import SearchBar from '../components/FileManager/SearchBar';
import { authFetch } from '../utils/authFetch';

const Files = () => {
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async ({ query }) => {
    if (!query) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await authFetch(`/api/files/search?query=${encodeURIComponent(query)}`);
      setSearchResults(data);
    } catch (err) {
      setError('Failed to search files. Please try again.');
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = async (filterParams) => {
    if (!filterParams) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (filterParams.ownerEmail) queryParams.append('owner_email', filterParams.ownerEmail);
      if (filterParams.isFolder !== null) queryParams.append('is_folder', filterParams.isFolder);
      if (filterParams.createdAfter) queryParams.append('created_after', filterParams.createdAfter.toISOString());
      if (filterParams.createdBefore) queryParams.append('created_before', filterParams.createdBefore.toISOString());

      const data = await authFetch(`/api/files/filter?${queryParams.toString()}`);
      setSearchResults(data);
    } catch (err) {
      setError('Failed to filter files. Please try again.');
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6 space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Search by Name</h3>
          <SearchBar type="search" onSearch={handleSearch} />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Advanced Filters</h3>
          <SearchBar type="filter" onSearch={handleFilter} />
        </div>
      </div>

      {isLoading && (
        <div className="text-center text-gray-600">Loading...</div>
      )}

      {error && (
        <div className="text-center text-red-600 mb-4">{error}</div>
      )}

      {searchResults ? (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Search Results ({searchResults.length})</h3>
          {searchResults.length === 0 ? (
            <p className="text-gray-500">No results found</p>
          ) : (
            <div className="grid gap-4">
              {searchResults.map((item) => (
                <div 
                  key={item.path} 
                  className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-blue-600">{item.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{item.path}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{item.is_folder ? 'Folder' : 'File'}</p>
                      {!item.is_folder && <p>Size: {(item.size / 1024).toFixed(2)} KB</p>}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Created: {new Date(item.created_at).toLocaleString()}</p>
                    {item.modified_at && (
                      <p>Modified: {new Date(item.modified_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <FileExplorer />
      )}
    </div>
  );
};

export default Files;