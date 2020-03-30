import { LHR } from 'lighthouse';
import { v4 as uuid } from 'uuid';
import { Logger } from 'winston';

import parentLogger from '../../logger';
import { AuditRow } from './db';

export interface AuditParams {
  id: string;
  url: string;
  timeCreated: Date;
  timeCompleted?: Date;
  report?: LHR;
}

export interface AuditBody {
  id: string;
  url: string;
  timeCreated: Date;
  timeCompleted?: Date;
  report?: LHR;
  status: AuditStatus;
}

export interface AuditListItem {
  id: string;
  url: string;
  timeCreated: Date;
  timeCompleted?: Date;
  status: AuditStatus;
}

export enum AuditStatus {
  RUNNING = 'RUNNING',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
}

export class Audit {
  static build(params: AuditParams): Audit {
    return new Audit(
      params.id,
      params.url,
      params.timeCreated,
      params.timeCompleted,
      params.report,
    );
  }

  static buildForUrl(url: string): Audit {
    const id = uuid();
    const timeCreated = new Date();
    return Audit.build({ id, url, timeCreated });
  }

  static buildForDbRow(row: AuditRow): Audit {
    return Audit.build({
      id: row.id,
      url: row.url,
      timeCreated: row.time_created,
      timeCompleted: row.time_completed || undefined,
      report: row.report_json || undefined,
    });
  }

  constructor(
    public id: string,
    public url: string,
    public timeCreated: Date,
    public timeCompleted?: Date,
    public report?: LHR,
  ) {}

  private get logger(): Logger {
    return parentLogger.child({ auditId: this.id });
  }

  get status(): AuditStatus {
    if (this.timeCompleted && this.report) return AuditStatus.COMPLETED;
    if (this.timeCompleted && !this.report) return AuditStatus.FAILED;
    return AuditStatus.RUNNING;
  }

  get reportJson(): string | undefined {
    if (!this.report) return undefined;
    try {
      return JSON.stringify(this.report);
    } catch (err) {
      this.logger.info(`report could not be converted to JSON\n${err}`);
      return undefined;
    }
  }

  get body(): AuditBody {
    return {
      id: this.id,
      url: this.url,
      timeCreated: this.timeCreated,
      timeCompleted: this.timeCompleted,
      report: this.report,
      status: this.status,
    };
  }

  get listItem(): AuditListItem {
    return {
      id: this.id,
      url: this.url,
      timeCreated: this.timeCreated,
      timeCompleted: this.timeCompleted,
      status: this.status,
    };
  }

  updateWithReport(report: LHR): Audit {
    this.report = report;
    this.markCompleted();
    return this;
  }

  markCompleted(): Audit {
    this.timeCompleted = new Date();
    return this;
  }
}