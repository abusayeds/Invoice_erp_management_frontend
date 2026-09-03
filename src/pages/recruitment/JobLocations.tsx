/**
 * File: src/pages/recruitment/JobLocations.tsx
 * Manage Job Locations – full CRUD with list view, view modal, and edit/create modal
 * Design matches EmployeeGoals, TrainingList, and provided screenshots
 */

import React, { useState, useMemo, useEffect } from "react";
import { api } from "@/lib/api/client";
import { toArray } from "@/services/_http";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  X,
  Eye,
  Building2,
  MapPin,
  Globe,
  CheckCircle,
  XCircle,
  Home,
  Briefcase,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  type: "On-site" | "Remote" | "Hybrid";
  status: "Active" | "Inactive";
  createdAt: string;
}

// ─── Sample Data (based on screenshot) ───────────────────────────────────────

const sampleLocations: JobLocation[] = [
  {
    id: "1",
    name: "Sydney Office",
    address: "200 George Street, Level 15",
    city: "Sydney",
    state: "New South Wales",
    country: "Australia",
    postalCode: "2000",
    type: "On-site",
    status: "Active",
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Paris Office",
    address: "75 Avenue des Champs-Elysees",
    city: "Paris",
    state: "Île-de-France",
    country: "France",
    postalCode: "75008",
    type: "On-site",
    status: "Inactive",
    createdAt: "2024-01-01",
  },
  {
    id: "3",
    name: "Seattle Office",
    address: "400 Dexter Avenue North",
    city: "Seattle",
    state: "Washington",
    country: "United States",
    postalCode: "98109",
    type: "On-site",
    status: "Inactive",
    createdAt: "2024-01-01",
  },
  {
    id: "4",
    name: "Remote Work - Asia Pacific",
    address: "Remote Work",
    city: "",
    state: "",
    country: "Asia Pacific",
    postalCode: "",
    type: "Remote",
    status: "Active",
    createdAt: "2024-01-01",
  },
  {
    id: "5",
    name: "Remote Work - Europe",
    address: "Remote Work",
    city: "",
    state: "",
    country: "Europe",
    postalCode: "",
    type: "Remote",
    status: "Active",
    createdAt: "2024-01-01",
  },
  {
    id: "6",
    name: "Dubai Office",
    address: "Dubai International Financial Centre",
    city: "Dubai",
    state: "Dubai",
    country: "United Arab Emirates",
    postalCode: "",
    type: "On-site",
    status: "Active",
    createdAt: "2024-01-01",
  },
  {
    id: "7",
    name: "Mumbai Office",
    address: "Bandra Kurla Complex, G Block",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    postalCode: "400051",
    type: "On-site",
    status: "Active",
    createdAt: "2024-01-01",
  },
  {
    id: "8",
    name: "Singapore Office",
    address: "1 Raffles Place, Tower 2, Level 61",
    city: "Singapore",
    state: "",
    country: "Singapore",
    postalCode: "048616",
    type: "On-site",
    status: "Active",
    createdAt: "2024-01-01",
  },
  {
    id: "9",
    name: "Tokyo Office",
    address: "1-1-1 Shibuya, Shibuya City",
    city: "Tokyo",
    state: "Tokyo",
    country: "Japan",
    postalCode: "150-0002",
    type: "On-site",
    status: "Active",
    createdAt: "2024-01-01",
  },
];

// Generate extra to reach 18 (as shown in screenshot footer)
for (let i = 10; i <= 18; i++) {
  sampleLocations.push({
    id: i.toString(),
    name: `Additional Location ${i}`,
    address: `${i * 100} Main Street`,
    city: "City",
    state: "State",
    country: "Country",
    postalCode: `${10000 + i}`,
    type: i % 3 === 0 ? "Remote" : i % 2 === 0 ? "Hybrid" : "On-site",
    status: i % 4 === 0 ? "Inactive" : "Active",
    createdAt: "2024-01-01",
  });
}

type SortField = "name" | "address" | "country" | "type" | "status";
type SortDir = "asc" | "desc";

// ─── Main Component ──────────────────────────────────────────────────────────

export const JobLocations: React.FC = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<JobLocation[]>(sampleLocations);
  useEffect(() => {
    let alive = true;
    api.raw.get("/recruitment/job-locations/all").then((res) => {
      const arr = toArray<any>(res.data);
      if (!alive || !arr.length) return;
      setLocations(arr.map((l: any) => ({
        id: String(l._id),
        name: l.name ?? "",
        address: l.address ?? "",
        city: l.city ?? "",
        state: l.state ?? "",
        country: l.country ?? "",
        postalCode: l.postal_code ?? "",
        type: l.remote_work ? "Remote" : "On-site",
        status: l.status === "Inactive" ? "Inactive" : "Active",
        createdAt: l.createdAt ? String(l.createdAt).slice(0, 10) : "",
      })) as JobLocation[]);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<JobLocation | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    type: "On-site" as JobLocation["type"],
    status: "Active" as JobLocation["status"],
  });

  // ─── Sorting & Filtering ───────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const filteredLocations = useMemo(() => {
    let result = [...locations];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (loc) =>
          loc.name.toLowerCase().includes(q) ||
          loc.address.toLowerCase().includes(q) ||
          loc.city.toLowerCase().includes(q) ||
          loc.state.toLowerCase().includes(q) ||
          loc.country.toLowerCase().includes(q),
      );
    }
    if (typeFilter !== "All") {
      result = result.filter((loc) => loc.type === typeFilter);
    }
    if (statusFilter !== "All") {
      result = result.filter((loc) => loc.status === statusFilter);
    }
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [locations, searchQuery, typeFilter, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredLocations.length / perPage);
  const paginatedLocations = filteredLocations.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      type: "On-site",
      status: "Active",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setShowCreateModal(true);
  };

  const openEditModal = (location: JobLocation) => {
    setSelectedLocation(location);
    setFormData({
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state,
      country: location.country,
      postalCode: location.postalCode,
      type: location.type,
      status: location.status,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const openViewModal = (location: JobLocation) => {
    setSelectedLocation(location);
    setShowViewModal(true);
  };

  const openDeleteModal = (location: JobLocation) => {
    setSelectedLocation(location);
    setShowDeleteModal(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      showToast("Please enter location name", "info");
      return;
    }
    if (!formData.address.trim()) {
      showToast("Please enter address", "info");
      return;
    }
    if (!formData.country.trim()) {
      showToast("Please enter country", "info");
      return;
    }

    if (isEditing && selectedLocation) {
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === selectedLocation.id
            ? {
                ...loc,
                name: formData.name.trim(),
                address: formData.address.trim(),
                city: formData.city.trim(),
                state: formData.state.trim(),
                country: formData.country.trim(),
                postalCode: formData.postalCode.trim(),
                type: formData.type,
                status: formData.status,
              }
            : loc,
        ),
      );
      showToast("Job location updated successfully!", "success");
      setShowEditModal(false);
    } else {
      const newLocation: JobLocation = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim(),
        postalCode: formData.postalCode.trim(),
        type: formData.type,
        status: formData.status,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setLocations((prev) => [newLocation, ...prev]);
      showToast("Job location created successfully!", "success");
      setShowCreateModal(false);
    }
    resetForm();
  };

  const handleDelete = () => {
    if (selectedLocation) {
      setLocations((prev) =>
        prev.filter((loc) => loc.id !== selectedLocation.id),
      );
      showToast("Job location deleted successfully!", "success");
      setShowDeleteModal(false);
      setSelectedLocation(null);
    }
  };

  const toggleStatus = (id: string, currentStatus: "Active" | "Inactive") => {
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === id
          ? {
              ...loc,
              status: currentStatus === "Active" ? "Inactive" : "Active",
            }
          : loc,
      ),
    );
    showToast(
      `Location ${currentStatus === "Active" ? "deactivated" : "activated"} successfully!`,
      "success",
    );
  };

  // ─── Sort Header Component ──────────────────────────────────────────────────

  const SortHeader: React.FC<{ field: SortField; label: string }> = ({
    field,
    label,
  }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-50 whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`w-3 h-3 ${sortField === field ? "text-gray-900" : "text-gray-400"}`}
        />
      </div>
    </th>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MODALS
  // ═══════════════════════════════════════════════════════════════════════════

  const CreateEditModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? "Edit Job Location" : "Create Job Location"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update location information"
                : "Add a new job location"}
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetForm();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Sydney Office"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.type === "Remote"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.checked ? "Remote" : "On-site",
                  })
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Remote Work</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country *
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) =>
                  setFormData({ ...formData, postalCode: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as any })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="On-site">On-site</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  status: formData.status === "Active" ? "Inactive" : "Active",
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.status === "Active" ? "bg-green-600" : "bg-gray-300"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.status === "Active" ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetForm();
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isEditing ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );

  const ViewModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Job Location Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedLocation?.name}
            </p>
          </div>
          <button
            onClick={() => setShowViewModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {selectedLocation && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedLocation.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Country</p>
                <p className="text-sm text-gray-600">
                  {selectedLocation.country}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm text-gray-600">
                  {selectedLocation.address}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">City</p>
                <p className="text-sm text-gray-600">
                  {selectedLocation.city || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">State</p>
                <p className="text-sm text-gray-600">
                  {selectedLocation.state || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Postal Code</p>
                <p className="text-sm text-gray-600">
                  {selectedLocation.postalCode || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {selectedLocation.type}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${selectedLocation.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                >
                  {selectedLocation.status === "Active" ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {selectedLocation.status}
                </span>
              </div>
            </div>
          </div>
        )}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => setShowViewModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={() => {
              setShowViewModal(false);
              if (selectedLocation) openEditModal(selectedLocation);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );

  const DeleteModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Delete Job Location
          </h3>
          <p className="text-gray-500 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{selectedLocation?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex-1 bg-[#FAFBFC] overflow-hidden flex flex-col">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button
              onClick={() => navigate("/")}
              className="hover:text-gray-700"
            >
              Dashboard
            </button>
            <span>›</span>
            <button
              onClick={() => navigate("/recruitment")}
              className="hover:text-gray-700"
            >
              Recruitment
            </button>
            <span>›</span>
            <span className="text-gray-900 font-medium">Job Locations</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-md px-2 py-1 bg-white">
            <Globe className="w-4 h-4" />
            <span>ga English</span>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Job Locations
          </h2>
          <button
            onClick={openCreateModal}
            className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-300 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Job Locations..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-80 pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md"
              />
            </div>
            <button
              onClick={() => showToast("Search applied", "info")}
              className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600"
            >
              Search
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 text-gray-500" />
                <span>Filters</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showFilters && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-3 pb-1.5 mb-1 border-b border-gray-100">
                    <span className="text-xs font-medium text-gray-500">
                      Type
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setTypeFilter("All");
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setTypeFilter("On-site");
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    On-site
                  </button>
                  <button
                    onClick={() => {
                      setTypeFilter("Remote");
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Remote
                  </button>
                  <button
                    onClick={() => {
                      setTypeFilter("Hybrid");
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Hybrid
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <div className="px-3 pb-1.5 mb-1">
                    <span className="text-xs font-medium text-gray-500">
                      Status
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setStatusFilter("All");
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Active");
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Active
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("Inactive");
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    Inactive
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-full px-3 py-1.5 text-left text-sm text-blue-600 hover:bg-blue-50"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-300">
              <tr>
                <SortHeader field="name" label="Name" />
                <SortHeader field="address" label="Address" />
                <SortHeader field="country" label="Country" />
                <SortHeader field="type" label="Type" />
                <SortHeader field="status" label="Status" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedLocations.map((loc) => (
                <tr
                  key={loc.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openViewModal(loc)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Home className="w-3.5 h-3.5 text-gray-400" />
                      {loc.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-md truncate">
                    {loc.address}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{loc.country}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {loc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${loc.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {loc.status === "Active" ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {loc.status}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewModal(loc)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(loc)}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(loc)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedLocations.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No job locations found.缓解
                  </td>{" "}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-sm text-gray-500">
            Showing{" "}
            {filteredLocations.length === 0
              ? 0
              : (currentPage - 1) * perPage + 1}{" "}
            to {Math.min(currentPage * perPage, filteredLocations.length)} of{" "}
            {filteredLocations.length} results
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) pageNumber = i + 1;
              else if (currentPage <= 3) pageNumber = i + 1;
              else if (currentPage >= totalPages - 2)
                pageNumber = totalPages - 4 + i;
              else pageNumber = currentPage - 2 + i;
              return (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`w-8 h-8 text-sm rounded-md flex items-center justify-center ${currentPage === pageNumber ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {(showCreateModal || showEditModal) && CreateEditModal()}
      {showViewModal && ViewModal()}
      {showDeleteModal && DeleteModal()}
    </div>
  );
};

export default JobLocations;
