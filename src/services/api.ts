/**
 * API Service Layer
 * Handles all API calls to the backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Ensure endpoint starts with / for proper URL construction
      const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const url = `${API_URL}${normalizedEndpoint}`;
      
      // Add timeout to requests (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (!response.ok) {
        console.error(`❌ API Error [${url}]:`, data.error || response.statusText);
        return { success: false, error: data.error || 'Request failed' };
      }

      return { success: true, data: data.data || data };
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout - the server took too long to respond',
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Customers
  async getCustomers() {
    return this.request('/customers');
  }

  async getCustomer(id: string) {
    return this.request(`/customers/${id}`);
  }

  async createCustomer(customer: any) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  async updateCustomer(id: string, customer: any) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
  }

  async deleteCustomer(id: string) {
    return this.request(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkCreateCustomers(customers: any[]) {
    return this.request('/customers/bulk', {
      method: 'POST',
      body: JSON.stringify({ customers }),
    });
  }

  // Brokers
  async getBrokers() {
    return this.request('/brokers');
  }

  async getBroker(id: string) {
    return this.request(`/brokers/${id}`);
  }

  async createBroker(broker: any) {
    return this.request('/brokers', {
      method: 'POST',
      body: JSON.stringify(broker),
    });
  }

  async updateBroker(id: string, broker: any) {
    return this.request(`/brokers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(broker),
    });
  }

  async deleteBroker(id: string) {
    return this.request(`/brokers/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkCreateBrokers(brokers: any[]) {
    return this.request('/brokers/bulk', {
      method: 'POST',
      body: JSON.stringify({ brokers }),
    });
  }

  // Projects
  async getProjects() {
    return this.request('/projects');
  }

  async getProject(id: string) {
    return this.request(`/projects/${id}`);
  }

  async createProject(project: any) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  async updateProject(id: string, project: any) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkCreateProjects(projects: any[]) {
    return this.request('/projects/bulk', {
      method: 'POST',
      body: JSON.stringify({ projects }),
    });
  }

  // Receipts
  async getReceipts() {
    return this.request('/receipts');
  }

  async getReceipt(id: string) {
    return this.request(`/receipts/${id}`);
  }

  async createReceipt(receipt: any) {
    return this.request('/receipts', {
      method: 'POST',
      body: JSON.stringify(receipt),
    });
  }

  async updateReceipt(id: string, receipt: any) {
    return this.request(`/receipts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(receipt),
    });
  }

  async deleteReceipt(id: string) {
    return this.request(`/receipts/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkCreateReceipts(receipts: any[]) {
    return this.request('/receipts/bulk', {
      method: 'POST',
      body: JSON.stringify({ receipts }),
    });
  }

  // Interactions
  async getInteractions() {
    return this.request('/interactions');
  }

  async getInteraction(id: string) {
    return this.request(`/interactions/${id}`);
  }

  async createInteraction(interaction: any) {
    return this.request('/interactions', {
      method: 'POST',
      body: JSON.stringify(interaction),
    });
  }

  async updateInteraction(id: string, interaction: any) {
    return this.request(`/interactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(interaction),
    });
  }

  async deleteInteraction(id: string) {
    return this.request(`/interactions/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkCreateInteractions(interactions: any[]) {
    return this.request('/interactions/bulk', {
      method: 'POST',
      body: JSON.stringify({ interactions }),
    });
  }

  // Inventory
  async getInventory() {
    return this.request('/inventory');
  }

  async getInventoryItem(id: string) {
    return this.request(`/inventory/${id}`);
  }

  async createInventoryItem(item: any) {
    return this.request('/inventory', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateInventoryItem(id: string, item: any) {
    return this.request(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async deleteInventoryItem(id: string) {
    return this.request(`/inventory/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkCreateInventoryItems(items: any[]) {
    return this.request('/inventory/bulk', {
      method: 'POST',
      body: JSON.stringify({ inventory: items }),
    });
  }

  // Commission Payments
  async getCommissionPayments() {
    return this.request('/commission-payments');
  }

  async createCommissionPayment(payment: any) {
    return this.request('/commission-payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  async updateCommissionPayment(id: string, payment: any) {
    return this.request(`/commission-payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payment),
    });
  }

  async deleteCommissionPayment(id: string) {
    return this.request(`/commission-payments/${id}`, {
      method: 'DELETE',
    });
  }

  // Master Projects
  async getMasterProjects() {
    return this.request('/master-projects');
  }

  async getMasterProject(id: string) {
    return this.request(`/master-projects/${id}`);
  }

  async createMasterProject(project: any) {
    return this.request('/master-projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  async updateMasterProject(id: string, project: any) {
    return this.request(`/master-projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
  }

  async deleteMasterProject(id: string) {
    return this.request(`/master-projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Company Reps
  async getCompanyReps() {
    return this.request('/company-reps');
  }

  async getCompanyRep(id: string) {
    return this.request(`/company-reps/${id}`);
  }

  async createCompanyRep(rep: any) {
    return this.request('/company-reps', {
      method: 'POST',
      body: JSON.stringify(rep),
    });
  }

  async updateCompanyRep(id: string, rep: any) {
    return this.request(`/company-reps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rep),
    });
  }

  async deleteCompanyRep(id: string) {
    return this.request(`/company-reps/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkCreateCompanyReps(reps: any[]) {
    return this.request('/company-reps/bulk', {
      method: 'POST',
      body: JSON.stringify({ companyReps: reps }),
    });
  }

  // Settings
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settings: any) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Backup & Migration
  async exportBackup() {
    return this.request('/backup/export');
  }

  async importBackup(backup: any) {
    return this.request('/backup/import', {
      method: 'POST',
      body: JSON.stringify(backup),
    });
  }

  async clearAllData() {
    return this.request('/backup/clear', {
      method: 'DELETE',
    });
  }

  async getAllData() {
    return this.request('/migration/all');
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${API_URL.replace('/api', '')}/health`);
      const data = await response.json();
      return { success: response.ok, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }
}

export const apiService = new ApiService();
export default apiService;