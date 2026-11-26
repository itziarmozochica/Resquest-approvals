import { inject, Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { Script } from '../script-loader/script.model';
import { ScriptService } from '../script-loader/script.service';
import { GooglePickerOpenOptions, PickedFile } from './google-picker.types';

const GAPI_SCRIPT_ID = 'google-api-js';
const GAPI_SCRIPT_URL = 'https://apis.google.com/js/api.js';
const GIS_SCRIPT_ID = 'google-identity-services';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

declare const gapi: {
  load(api: string, callback: () => void): void;
};

declare const google: {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
        error_callback?: (error: unknown) => void;
      }): { requestAccessToken(): void };
    };
  };
  picker: {
    PickerBuilder: new () => PickerBuilder;
    ViewId: { DOCS: string };
    DocsView: new (viewId?: string) => DocsView;
    Action: { PICKED: string; CANCEL: string };
    Feature: { NAV_HIDDEN: string; MULTISELECT_ENABLED: string };
  };
};

interface PickerBuilder {
  addView(view: DocsView): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(appId: string): PickerBuilder;
  setCallback(callback: (data: PickerCallbackData) => void): PickerBuilder;
  enableFeature(feature: string): PickerBuilder;
  build(): { setVisible(visible: boolean): void };
}

interface DocsView {
  setParent(folderId: string): DocsView;
  setIncludeFolders(include: boolean): DocsView;
  setSelectFolderEnabled(enabled: boolean): DocsView;
  setMimeTypes(mimeTypes: string): DocsView;
}

interface PickerCallbackData {
  action: string;
  docs?: { id: string; name: string; mimeType: string; url?: string; embedUrl?: string }[];
}

@Injectable({ providedIn: 'root' })
export class GooglePickerService {
  readonly #scriptService = inject(ScriptService);
  #gapiLoaded = false;
  #pickerLoaded = false;
  #gisLoaded = false;
  #accessToken: string | null = null;

  async open(options: GooglePickerOpenOptions = {}): Promise<PickedFile | null> {
    await this.#ensureScripts();
    const token = await this.#getAccessToken();
    return new Promise<PickedFile | null>(resolve => {
      const docsView = new google.picker.DocsView(google.picker.ViewId.DOCS);
      if (options.parentFolderId) {
        docsView.setParent(options.parentFolderId);
      }
      docsView.setIncludeFolders(Boolean(options.selectFolders));
      docsView.setSelectFolderEnabled(Boolean(options.selectFolders));
      if (options.acceptedMimeTypes && options.acceptedMimeTypes.length > 0) {
        docsView.setMimeTypes(options.acceptedMimeTypes.join(','));
      }

      const picker = new google.picker.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(token)
        .setDeveloperKey(environment.googlePickerApiKey ?? '')
        .setAppId(environment.googlePickerAppId ?? '')
        .setCallback(data => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs?.[0];
            if (!doc) {
              resolve(null);
              return;
            }
            resolve({
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              url: doc.url ?? doc.embedUrl ?? '',
            });
          } else if (data.action === google.picker.Action.CANCEL) {
            resolve(null);
          }
        })
        .build();
      picker.setVisible(true);
    });
  }

  /**
   * Downloads a picked file's content with the user's own OAuth token (the drive.file grant from
   * the picker covers it). Google-native docs are exported to PDF; binary files stream as-is.
   */
  async downloadPickedFile(picked: PickedFile): Promise<File> {
    const token = await this.#getAccessToken();
    const isNativeDoc = picked.mimeType.startsWith('application/vnd.google-apps.');
    const url = isNativeDoc
      ? `https://www.googleapis.com/drive/v3/files/${picked.id}/export?mimeType=application/pdf`
      : `https://www.googleapis.com/drive/v3/files/${picked.id}?alt=media`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      throw new Error(`Drive download failed with status ${response.status}`);
    }
    const blob = await response.blob();
    const name = isNativeDoc ? `${picked.name}.pdf` : picked.name;
    const type = isNativeDoc ? 'application/pdf' : picked.mimeType || blob.type;
    return new File([blob], name, { type });
  }

  async #ensureScripts(): Promise<void> {
    if (!this.#gapiLoaded) {
      await this.#loadScript(GAPI_SCRIPT_ID, GAPI_SCRIPT_URL);
      this.#gapiLoaded = true;
    }
    if (!this.#pickerLoaded) {
      await new Promise<void>((resolve, reject) => {
        try {
          gapi.load('picker', () => resolve());
        } catch (err) {
          reject(err);
        }
      });
      this.#pickerLoaded = true;
    }
    if (!this.#gisLoaded) {
      await this.#loadScript(GIS_SCRIPT_ID, GIS_SCRIPT_URL);
      this.#gisLoaded = true;
    }
  }

  async #loadScript(id: string, src: string): Promise<void> {
    if (this.#scriptService.checkIfScriptIsLoaded(id)) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.#scriptService.loadScript(new Script(id, 'text/javascript', src, true)).subscribe({
        next: () => resolve(),
        error: err => reject(err),
      });
    });
  }

  async #getAccessToken(): Promise<string> {
    if (this.#accessToken) {
      return this.#accessToken;
    }
    return new Promise<string>((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: environment.googlePickerClientId ?? '',
        scope: DRIVE_SCOPE,
        callback: response => {
          if (response.access_token) {
            this.#accessToken = response.access_token;
            resolve(response.access_token);
          } else {
            reject(new Error(response.error ?? 'Failed to obtain Drive access token'));
          }
        },
        error_callback: err => reject(err),
      });
      client.requestAccessToken();
    });
  }
}
