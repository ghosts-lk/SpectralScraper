/**
 * Bulk Operations Service
 * High-performance batch processing with real-time progress tracking
 * Optimized for 100k+ lead processing like Hunter.io and Apollo.io
 */

import { EventEmitter } from 'events';
import { Lead } from './types';
import AdvancedLeadScorer from './advanced-lead-scoring';
import { VerificationService } from './verification-service';
import { CRMManager } from './crm-integration';

export interface BulkOperationConfig {
  batchSize: number;
  parallelBatches: number;
  verifyEmails: boolean;
  scoreLeads: boolean;
  syncToCRM: boolean;
  deduplicate: boolean;
  timeout: number; // milliseconds
}

export interface BulkOperationProgress {
  operationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  processed: number;
  total: number;
  successCount: number;
  failureCount: number;
  progress: number; // 0-100
  estimatedTimeRemaining: number; // seconds
  averageProcessingTime: number; // ms per lead
  startTime: Date;
  endTime?: Date;
  results: any[];
  errors: Array<{ leadId: string; error: string }>;
}

export class BulkOperationService extends EventEmitter {
  private operations: Map<string, BulkOperationProgress> = new Map();
  private scorer: AdvancedLeadScorer;
  private verifier: VerificationService;
  private crmManager: CRMManager;

  constructor() {
    super();
    this.scorer = new AdvancedLeadScorer();
    this.verifier = new VerificationService();
    this.crmManager = new CRMManager();
  }

  /**
   * Start bulk verification operation
   */
  async bulkVerify(
    leads: Lead[],
    config: Partial<BulkOperationConfig> = {}
  ): Promise<string> {
    const operationId = `verify-${Date.now()}`;
    const fullConfig: BulkOperationConfig = {
      batchSize: 100,
      parallelBatches: 5,
      verifyEmails: true,
      scoreLeads: false,
      syncToCRM: false,
      deduplicate: true,
      timeout: 30000,
      ...config,
    };

    const operation: BulkOperationProgress = {
      operationId,
      status: 'pending',
      processed: 0,
      total: leads.length,
      successCount: 0,
      failureCount: 0,
      progress: 0,
      estimatedTimeRemaining: 0,
      averageProcessingTime: 0,
      startTime: new Date(),
      results: [],
      errors: [],
    };

    this.operations.set(operationId, operation);
    this.emit('operation:created', operation);

    // Run async
    this.executeVerificationBatch(leads, operationId, fullConfig);

    return operationId;
  }

  /**
   * Execute verification batch processing
   */
  private async executeVerificationBatch(
    leads: Lead[],
    operationId: string,
    config: BulkOperationConfig
  ): Promise<void> {
    const operation = this.operations.get(operationId)!;
    operation.status = 'running';

    try {
      const startTime = Date.now();
      const batches: Lead[][] = [];

      // Create batches
      for (let i = 0; i < leads.length; i += config.batchSize) {
        batches.push(leads.slice(i, i + config.batchSize));
      }

      // Process batches in parallel (with concurrency limit)
      for (let i = 0; i < batches.length; i += config.parallelBatches) {
        const parallelBatches = batches.slice(i, i + config.parallelBatches);
        const batchPromises = parallelBatches.map(batch =>
          this.processBatch(batch, operation, config)
        );

        await Promise.all(batchPromises);

        // Update progress
        const elapsedTime = Date.now() - startTime;
        const avgTime = elapsedTime / operation.processed;
        const remainingLeads = operation.total - operation.processed;
        operation.averageProcessingTime = avgTime;
        operation.estimatedTimeRemaining = Math.round((avgTime * remainingLeads) / 1000);
        operation.progress = Math.round((operation.processed / operation.total) * 100);

        this.emit('operation:progress', operation);
      }

      operation.status = 'completed';
      operation.endTime = new Date();
      this.emit('operation:completed', operation);
    } catch (error: any) {
      operation.status = 'failed';
      operation.endTime = new Date();
      operation.errors.push({
        leadId: 'batch-operation',
        error: error.message,
      });
      this.emit('operation:failed', operation);
    }
  }

  /**
   * Process individual batch
   */
  private async processBatch(
    batch: Lead[],
    operation: BulkOperationProgress,
    config: BulkOperationConfig
  ): Promise<void> {
    const batchResults = await Promise.all(
      batch.map(async lead => {
        try {
          if (config.verifyEmails) {
            const verificationResult = await this.verifier.verify({
              email: lead.email,
              phone: lead.phone,
            });

            lead.verified = verificationResult.email?.verified || false;
            lead.confidence = verificationResult.email?.confidence || 0;
          }

          if (config.scoreLeads) {
            const scoring = this.scorer.scoreLeadComprehensive(lead);
            lead.score = scoring.score;
          }

          operation.successCount++;
          return { success: true, lead };
        } catch (error: any) {
          operation.failureCount++;
          operation.errors.push({
            leadId: lead.id,
            error: error.message,
          });
          return { success: false, lead, error };
        } finally {
          operation.processed++;
        }
      })
    );

    operation.results.push(...batchResults);
  }

  /**
   * Start bulk scoring operation
   */
  async bulkScore(leads: Lead[], config: Partial<BulkOperationConfig> = {}): Promise<string> {
    const operationId = `score-${Date.now()}`;
    const fullConfig: BulkOperationConfig = {
      batchSize: 500, // Scoring is lighter than verification
      parallelBatches: 10,
      verifyEmails: false,
      scoreLeads: true,
      syncToCRM: false,
      deduplicate: false,
      timeout: 10000,
      ...config,
    };

    const operation: BulkOperationProgress = {
      operationId,
      status: 'pending',
      processed: 0,
      total: leads.length,
      successCount: 0,
      failureCount: 0,
      progress: 0,
      estimatedTimeRemaining: 0,
      averageProcessingTime: 0,
      startTime: new Date(),
      results: [],
      errors: [],
    };

    this.operations.set(operationId, operation);
    this.emit('operation:created', operation);

    this.executeVerificationBatch(leads, operationId, fullConfig);

    return operationId;
  }

  /**
   * Start bulk CRM sync operation
   */
  async bulkSyncToCRM(
    leads: Lead[],
    config: Partial<BulkOperationConfig> = {}
  ): Promise<string> {
    const operationId = `crm-sync-${Date.now()}`;
    const fullConfig: BulkOperationConfig = {
      batchSize: 50, // CRM APIs are rate-limited
      parallelBatches: 3,
      verifyEmails: false,
      scoreLeads: false,
      syncToCRM: true,
      deduplicate: false,
      timeout: 60000,
      ...config,
    };

    const operation: BulkOperationProgress = {
      operationId,
      status: 'pending',
      processed: 0,
      total: leads.length,
      successCount: 0,
      failureCount: 0,
      progress: 0,
      estimatedTimeRemaining: 0,
      averageProcessingTime: 0,
      startTime: new Date(),
      results: [],
      errors: [],
    };

    this.operations.set(operationId, operation);
    this.emit('operation:created', operation);

    this.executeCRMSync(leads, operationId, fullConfig);

    return operationId;
  }

  /**
   * Execute CRM sync batch
   */
  private async executeCRMSync(
    leads: Lead[],
    operationId: string,
    config: BulkOperationConfig
  ): Promise<void> {
    const operation = this.operations.get(operationId)!;
    operation.status = 'running';

    try {
      const startTime = Date.now();
      const batches: Lead[][] = [];

      for (let i = 0; i < leads.length; i += config.batchSize) {
        batches.push(leads.slice(i, i + config.batchSize));
      }

      for (let i = 0; i < batches.length; i += config.parallelBatches) {
        const parallelBatches = batches.slice(i, i + config.parallelBatches);
        const batchPromises = parallelBatches.map(batch =>
          this.processCRMBatch(batch, operation)
        );

        await Promise.all(batchPromises);

        const elapsedTime = Date.now() - startTime;
        const avgTime = elapsedTime / operation.processed;
        const remainingLeads = operation.total - operation.processed;
        operation.averageProcessingTime = avgTime;
        operation.estimatedTimeRemaining = Math.round((avgTime * remainingLeads) / 1000);
        operation.progress = Math.round((operation.processed / operation.total) * 100);

        this.emit('operation:progress', operation);
      }

      operation.status = 'completed';
      operation.endTime = new Date();
      this.emit('operation:completed', operation);
    } catch (error: any) {
      operation.status = 'failed';
      operation.endTime = new Date();
      operation.errors.push({
        leadId: 'batch-operation',
        error: error.message,
      });
      this.emit('operation:failed', operation);
    }
  }

  /**
   * Process CRM batch
   */
  private async processCRMBatch(batch: Lead[], operation: BulkOperationProgress): Promise<void> {
    const results = await this.crmManager.batchSyncToAll(batch);

    const stats = Array.from(results.values()).reduce(
      (acc, platformResults) => {
        const platformStats = this.crmManager.getSyncStats(platformResults);
        acc.successCount += platformStats.successful;
        acc.failureCount += platformStats.failed;
        return acc;
      },
      { successCount: 0, failureCount: 0 }
    );

    operation.successCount += stats.successCount;
    operation.failureCount += stats.failureCount;
    operation.processed += batch.length;
    operation.results.push(results);
  }

  /**
   * Get operation status
   */
  getOperation(operationId: string): BulkOperationProgress | undefined {
    return this.operations.get(operationId);
  }

  /**
   * Get all active operations
   */
  getActiveOperations(): BulkOperationProgress[] {
    return Array.from(this.operations.values()).filter(
      op => op.status === 'pending' || op.status === 'running'
    );
  }

  /**
   * Cancel operation
   */
  cancelOperation(operationId: string): boolean {
    const operation = this.operations.get(operationId);
    if (operation && (operation.status === 'pending' || operation.status === 'running')) {
      operation.status = 'cancelled';
      operation.endTime = new Date();
      this.emit('operation:cancelled', operation);
      return true;
    }
    return false;
  }

  /**
   * Get historical operations
   */
  getOperationHistory(limit: number = 100): BulkOperationProgress[] {
    return Array.from(this.operations.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Get comprehensive statistics
   */
  getGlobalStats(): {
    totalOperations: number;
    activeOperations: number;
    totalLeadsProcessed: number;
    successRate: string;
    averageProcessingTime: number;
  } {
    const ops = Array.from(this.operations.values());
    const totalProcessed = ops.reduce((sum, op) => sum + op.processed, 0);
    const totalSuccessful = ops.reduce((sum, op) => sum + op.successCount, 0);
    const totalTime = ops.reduce((sum, op) => sum + op.averageProcessingTime, 0);

    return {
      totalOperations: ops.length,
      activeOperations: ops.filter(op => op.status === 'running').length,
      totalLeadsProcessed: totalProcessed,
      successRate: totalProcessed > 0 ? `${((totalSuccessful / totalProcessed) * 100).toFixed(1)}%` : '0%',
      averageProcessingTime: ops.length > 0 ? Math.round(totalTime / ops.length) : 0,
    };
  }
}

export default BulkOperationService;
