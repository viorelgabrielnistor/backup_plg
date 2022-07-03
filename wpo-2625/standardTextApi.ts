import { AxiosPromise } from 'axios';

import { axiosInstance } from './axiosClient';
import apiPaths from './apiPaths';
import { IPatchValue } from '../helpers/patchValue';
import { STATUS } from '../constants';
import { IStandardText, ISubject } from '../services/standardText/standardTextInterface';

export const standardTextApi: {
  getStandardTexts: (clientId: string, language: string, project?: string, status?: STATUS | null) => AxiosPromise;
  patchStandardText: (clientId: string, id: string, language: string, values: IPatchValue[]) => AxiosPromise;
  postStandardText: (clientId: string, language: string, category: any) => AxiosPromise;
  putStandardText: (clientId: string, language: string, id: string, category: any) => AxiosPromise;
  getStandardTextById: (params: {client: string; language: string; categoryId: string}) => AxiosPromise;
  getAllStandardTextCategory: (clientId: string, projectId: string, language: string, status: STATUS | null) => AxiosPromise;
  putStandardTexts: (clientId: string, language: string, values: IStandardText<ISubject[]>[] | null) => AxiosPromise;
  // deleteStandardTextById: (params: {client: string; language: string; categoryId: string}) => AxiosPromise;
  deleteStandardTextById: (params: {client: string; language: string; categoryId: string}) => void;
} = {
  getStandardTexts: (clientId, language, project, status) => {
    const params = project && status ? { params: { status, project } } : {};
    return axiosInstance.get(apiPaths.client + clientId + apiPaths.standardText + `/${language}`, params);
  },
  patchStandardText: (clientId, id, language, values) => axiosInstance.patch(
    apiPaths.client + clientId + apiPaths.standardText + `/${ language }/${ id }`, values),
  postStandardText: (clientId, language, category) => axiosInstance.post(
    apiPaths.client + clientId + apiPaths.standardText + `/${ language }`, category),
  putStandardText: (clientId, language: string, id: string, category: any) => axiosInstance.put(
    apiPaths.client + clientId + apiPaths.standardText + `/${ language }/${ id }`, category),
  getStandardTextById: ({ client, language, categoryId }) => axiosInstance.get(
    apiPaths.client + client + apiPaths.standardText + `/${ language }/${ categoryId }`),
  getAllStandardTextCategory: (clientId, projectId, language, status) => axiosInstance.get(
    apiPaths.client + clientId + apiPaths.project + projectId + apiPaths.standardText + `/${language}`, { params: { status } }),
  putStandardTexts: (clientId, language, values) => axiosInstance.put(
    apiPaths.client + clientId + apiPaths.standardText + `/${language}/`, values),
  // deleteStandardTextById: ({ client, language, categoryId }) => axiosInstance.get( apiPaths.client + client + apiPaths.standardText + `/${ language }/${ categoryId }`)
  deleteStandardTextById: ({ client, language, categoryId }) => console.table([
    [client, 'client id'],
    [language, 'lg name'],
    [categoryId, 'categ id']
  ])
};
