/**
 * CRM Integration Framework
 * Sync leads to HubSpot, Salesforce, Pipedrive, and other platforms
 * Matches Apollo.io and Hunter.io CRM capabilities
 */

import { Lead } from './types';
import axios, { AxiosInstance } from 'axios';

export interface CRMConfig {
  platform: 'hubspot' | 'salesforce' | 'pipedrive' | 'zoho' | 'custom';
  apiKey: string;
  baseUrl?: string;
  accountId?: string;
}

export interface CRMMapping {
  lead: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    jobTitle: string;
    customFields?: Record<string, string>;
  };
}

export interface SyncResult {
  success: boolean;
  leadId: string;
  crmId: string;
  crmPlatform: string;
  timestamp: string;
  status: 'created' | 'updated' | 'failed' | 'duplicate';
  message: string;
}

/**
 * HubSpot CRM Integration
 */
export class HubSpotIntegration {
  private client: AxiosInstance;

  constructor(config: CRMConfig) {
    this.client = axios.create({
      baseURL: 'https://api.hubapi.com',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create or update contact in HubSpot
   */
  async syncLead(lead: Lead): Promise<SyncResult> {
    try {
      const [firstName, ...lastNameParts] = (lead.name || 'Unknown').split(' ');
      const lastName = lastNameParts.join(' ') || 'Contact';

      // Check if contact exists
      let contactId: string | null = null;
      if (lead.email) {
        const searchResult = await this.searchContact(lead.email);
        contactId = searchResult?.id;
      }

      const payload = {
        properties: [
          { name: 'firstname', value: firstName },
          { name: 'lastname', value: lastName },
          { name: 'email', value: lead.email },
          { name: 'phone', value: lead.phone },
          { name: 'jobtitle', value: lead.title },
          { name: 'company', value: lead.company },
          { name: 'hs_lead_score', value: String(lead.score || 0) },
          { name: 'hs_lead_status', value: 'New' },
          {
            name: 'notes',
            value: `Sources: ${lead.sources?.join(', ') || 'Unknown'}\nConfidence: ${lead.confidence || 0}`,
          },
        ],
      };

      let result;
      if (contactId) {
        // Update existing
        result = await this.client.patch(`/crm/v3/objects/contacts/${contactId}`, payload);
        return {
          success: true,
          leadId: lead.id,
          crmId: contactId,
          crmPlatform: 'hubspot',
          timestamp: new Date().toISOString(),
          status: 'updated',
          message: 'Contact updated successfully',
        };
      } else {
        // Create new
        result = await this.client.post('/crm/v3/objects/contacts', payload);
        const newContactId = result.data.id;

        return {
          success: true,
          leadId: lead.id,
          crmId: newContactId,
          crmPlatform: 'hubspot',
          timestamp: new Date().toISOString(),
          status: 'created',
          message: 'Contact created successfully',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        leadId: lead.id,
        crmId: '',
        crmPlatform: 'hubspot',
        timestamp: new Date().toISOString(),
        status: 'failed',
        message: `Failed to sync: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  /**
   * Search for existing contact
   */
  private async searchContact(email: string): Promise<any> {
    try {
      const result = await this.client.get('/crm/v3/objects/contacts', {
        params: {
          limit: 1,
          after: 0,
          'properties': ['firstname', 'lastname', 'email'],
          'filterGroups': [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
        },
      });
      return result.data.results?.[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Batch sync leads
   */
  async batchSync(leads: Lead[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const lead of leads) {
      const result = await this.syncLead(lead);
      results.push(result);
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }
}

/**
 * Salesforce CRM Integration
 */
export class SalesforceIntegration {
  private client: AxiosInstance;
  private instanceUrl: string;

  constructor(config: CRMConfig) {
    this.instanceUrl = config.baseUrl || 'https://your-instance.salesforce.com';
    this.client = axios.create({
      baseURL: `${this.instanceUrl}/services/data/v60.0`,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create or update lead in Salesforce
   */
  async syncLead(lead: Lead): Promise<SyncResult> {
    try {
      const [firstName, ...lastNameParts] = (lead.name || 'Unknown').split(' ');
      const lastName = lastNameParts.join(' ') || 'Contact';

      // Check if lead exists
      const existingLead = await this.findLeadByEmail(lead.email);

      const payload = {
        FirstName: firstName,
        LastName: lastName,
        Email: lead.email,
        Phone: lead.phone,
        Title: lead.title,
        Company: lead.company,
        Country: lead.location?.country,
        City: lead.location?.city,
        Description: `Score: ${lead.score}, Sources: ${lead.sources?.join(', ') || 'Unknown'}`,
      };

      let result;
      if (existingLead?.Id) {
        // Update existing
        await this.client.patch(`/sobjects/Lead/${existingLead.Id}`, payload);
        return {
          success: true,
          leadId: lead.id,
          crmId: existingLead.Id,
          crmPlatform: 'salesforce',
          timestamp: new Date().toISOString(),
          status: 'updated',
          message: 'Lead updated successfully',
        };
      } else {
        // Create new
        result = await this.client.post('/sobjects/Lead', payload);
        return {
          success: true,
          leadId: lead.id,
          crmId: result.data.id,
          crmPlatform: 'salesforce',
          timestamp: new Date().toISOString(),
          status: 'created',
          message: 'Lead created successfully',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        leadId: lead.id,
        crmId: '',
        crmPlatform: 'salesforce',
        timestamp: new Date().toISOString(),
        status: 'failed',
        message: `Failed to sync: ${error.response?.data?.[0]?.message || error.message}`,
      };
    }
  }

  /**
   * Find lead by email
   */
  private async findLeadByEmail(email: string): Promise<any> {
    try {
      const result = await this.client.get('/query', {
        params: {
          q: `SELECT Id, Email FROM Lead WHERE Email = '${email}' LIMIT 1`,
        },
      });
      return result.data.records?.[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Batch sync leads
   */
  async batchSync(leads: Lead[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const lead of leads) {
      const result = await this.syncLead(lead);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }
}

/**
 * Pipedrive CRM Integration
 */
export class PipedriveIntegration {
  private client: AxiosInstance;

  constructor(config: CRMConfig) {
    this.client = axios.create({
      baseURL: 'https://api.pipedrive.com/v1',
      params: {
        api_token: config.apiKey,
      },
    });
  }

  /**
   * Create or update person in Pipedrive
   */
  async syncLead(lead: Lead): Promise<SyncResult> {
    try {
      const [firstName, ...lastNameParts] = (lead.name || 'Unknown').split(' ');
      const lastName = lastNameParts.join(' ') || 'Contact';

      // Check if person exists
      const existing = await this.findPersonByEmail(lead.email);

      const payload = {
        name: lead.name,
        email: [{ value: lead.email, primary: true }],
        phone: [{ value: lead.phone, primary: true }],
        org_id: 0, // Can be populated with existing/created org
        custom_fields: {
          job_title: lead.title,
          lead_score: lead.score?.toString(),
          data_source: lead.sources?.join(', '),
        },
      };

      let result;
      if (existing?.id) {
        // Update existing
        result = await this.client.put(`/persons/${existing.id}`, payload);
        return {
          success: true,
          leadId: lead.id,
          crmId: String(existing.id),
          crmPlatform: 'pipedrive',
          timestamp: new Date().toISOString(),
          status: 'updated',
          message: 'Person updated successfully',
        };
      } else {
        // Create new
        result = await this.client.post('/persons', payload);
        const newPersonId = result.data.data.id;

        return {
          success: true,
          leadId: lead.id,
          crmId: String(newPersonId),
          crmPlatform: 'pipedrive',
          timestamp: new Date().toISOString(),
          status: 'created',
          message: 'Person created successfully',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        leadId: lead.id,
        crmId: '',
        crmPlatform: 'pipedrive',
        timestamp: new Date().toISOString(),
        status: 'failed',
        message: `Failed to sync: ${error.response?.data?.error || error.message}`,
      };
    }
  }

  /**
   * Find person by email
   */
  private async findPersonByEmail(email: string): Promise<any> {
    try {
      const result = await this.client.get('/persons/search', {
        params: { term: email, search_by_email: 1 },
      });
      return result.data.data?.items?.[0]?.item;
    } catch (error) {
      return null;
    }
  }

  /**
   * Batch sync leads
   */
  async batchSync(leads: Lead[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const lead of leads) {
      const result = await this.syncLead(lead);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }
}

/**
 * CRM Manager - Factory for creating integrations
 */
export class CRMManager {
  private integrations: Map<string, any> = new Map();

  /**
   * Register CRM integration
   */
  registerIntegration(config: CRMConfig): void {
    switch (config.platform) {
      case 'hubspot':
        this.integrations.set('hubspot', new HubSpotIntegration(config));
        break;
      case 'salesforce':
        this.integrations.set('salesforce', new SalesforceIntegration(config));
        break;
      case 'pipedrive':
        this.integrations.set('pipedrive', new PipedriveIntegration(config));
        break;
    }
  }

  /**
   * Sync lead to registered platforms
   */
  async syncLeadToAll(lead: Lead): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const [platform, integration] of this.integrations) {
      try {
        const result = await integration.syncLead(lead);
        results.push(result);
      } catch (error: any) {
        results.push({
          success: false,
          leadId: lead.id,
          crmId: '',
          crmPlatform: platform,
          timestamp: new Date().toISOString(),
          status: 'failed',
          message: `Integration error: ${error.message}`,
        });
      }
    }

    return results;
  }

  /**
   * Batch sync to all registered platforms
   */
  async batchSyncToAll(leads: Lead[]): Promise<Map<string, SyncResult[]>> {
    const results = new Map<string, SyncResult[]>();

    for (const [platform, integration] of this.integrations) {
      const platformResults = await integration.batchSync(leads);
      results.set(platform, platformResults);
    }

    return results;
  }

  /**
   * Get sync statistics
   */
  getSyncStats(results: SyncResult[]): {
    total: number;
    successful: number;
    failed: number;
    created: number;
    updated: number;
    successRate: string;
  } {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const created = results.filter(r => r.status === 'created').length;
    const updated = results.filter(r => r.status === 'updated').length;

    return {
      total: results.length,
      successful,
      failed,
      created,
      updated,
      successRate: `${((successful / results.length) * 100).toFixed(1)}%`,
    };
  }
}

export default CRMManager;
