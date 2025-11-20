import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { shareReplay } from 'rxjs/internal/operators/shareReplay';

import { environment } from '../../../environments/environment';

import {
  BlastPagedQuery,
  PagedMetadata,
} from '../models/domain/pagination.model';
import { BlastsResponse } from '../../features/blasts/models/blasts';
import { CreateBlastRequest } from '../../features/blasts/models/create-blast';
import { ProjectResponse } from '../../features/projects/models/project';
import { ArchiveCampaignsResponse } from '../../features/blasts/models/archive-campaigns';
//import { ArchiveReadViewModel } from '../view-models/archive/archiveRead.model';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private readonly baseUrl = `${
    environment.digitalCommunication.url
  }${'database/'}`;
  private readonly authorizationToken = environment.digitalCommunication.token;
  private correlationId = `${Date.now()}-${Math.random().toString(36)}`;

  constructor(private httpClient: HttpClient) {}

  postBlast(request: CreateBlastRequest) {
    return this.httpClient.post<number>(`${this.baseUrl}postBlast`, request, {
      headers: {
        AuthorizationToken: this.authorizationToken,
        'X-Correlation-ID': this.correlationId,
      },
    });
  }

  getBlastsByProject(id: number, metadata: PagedMetadata) {
    return this.httpClient
      .get<BlastsResponse[]>(
        `${this.baseUrl}getBlastsByProject/${id}?pageNumber=${metadata.currentPage}&pageSize=${metadata.pageSize}&sortBy=sendAt`,
        {
          responseType: 'json',
          headers: {
            AuthorizationToken: this.authorizationToken,
            'X-Correlation-ID': this.correlationId,
          },
          observe: 'response',
        }
      )
      .pipe(shareReplay());
  }

  getBlastsByProjectFilter(query: BlastPagedQuery) {
    let params = new HttpParams();
    params = params.set('projectId', query.projectId);

    if (query.pageNumber) {
      params = params.set('pageNumber', query.pageNumber.toString());
    }
    if (query.pageSize) {
      params = params.set('pageSize', query.pageSize.toString());
    }
    if (query.sortBy) {
      params = params.set('sortBy', query.sortBy);
    }
    if (query.sortDirection) {
      params = params.set('sortDirection', query.sortDirection);
    }
    if (query.name) {
      // This handles the search term
      params = params.set('name', query.name);
    }

    // 3. Use the params object in the GET request
    return this.httpClient
      .get<BlastsResponse[]>(
        `${this.baseUrl}getBlastsByProjectFilter`, // Clean URL, no query string needed
        {
          responseType: 'json',
          headers: {
            AuthorizationToken: this.authorizationToken,
            'X-Correlation-ID': this.correlationId,
          },
          observe: 'response', // Keep observe: 'response' to read headers for pagination
          params: params, // <<< --- THIS IS THE CRITICAL CHANGE
        }
      )
      .pipe(shareReplay());
  }

  getArchive(id: number) {
    return this.httpClient
      .get<ArchiveCampaignsResponse>(`${this.baseUrl}getArchive/${id}`, {
        responseType: 'json',
        headers: {
          AuthorizationToken: this.authorizationToken,
          'X-Correlation-ID': this.correlationId,
        },
      })
      .pipe(shareReplay());
  }

  getTags() {
    return this.httpClient
      .get<string[]>(`${this.baseUrl}getTags`, {
        responseType: 'json',
        headers: {
          AuthorizationToken: this.authorizationToken,
          'X-Correlation-ID': this.correlationId,
        },
      })
      .pipe(shareReplay());
  }

  deleteCampaign(id: number) {
    return this.httpClient.delete(`${this.baseUrl}deleteCampaignDb/${id}`, {
      headers: {
        AuthorizationToken: this.authorizationToken,
        'X-Correlation-ID': this.correlationId,
      },
    });
  }

  getProjects() {
    return this.httpClient
      .get<ProjectResponse[]>(`${this.baseUrl}getProjects`, {
        responseType: 'json',
        headers: {
          AuthorizationToken: this.authorizationToken,
          'X-Correlation-ID': this.correlationId,
        },
      })
      .pipe(shareReplay());
  }
}
