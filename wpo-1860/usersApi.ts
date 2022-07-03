import { AxiosPromise } from 'axios';

import { axiosInstance } from './axiosClient';
import apiPaths from './apiPaths';
import { IPatchValue } from '../helpers/patchValue';
import { IUserFiltersQuery, IUserValues } from '../services/usersInterface';

export const usersApi: {
  getUsers: (params?: Partial<IUserFiltersQuery>) => AxiosPromise;
  getFilters: (filters: Partial<IUserFiltersQuery>) => AxiosPromise;
  getUserDetails: (id) => AxiosPromise;
  getUserLogged: () => AxiosPromise;
  setNewUser: (values: IUserValues) => AxiosPromise;
  updateUser: (id: string, values: IUserValues) => AxiosPromise;
  patchUser: (id: string, values: IPatchValue[]) => AxiosPromise;
  getUserRoles: () => AxiosPromise;
  getTsscManagers: () => AxiosPromise;
} = {
  getUsers: (params?) => axiosInstance.get(apiPaths.user, { params }),
  getFilters: (filters) => axiosInstance.get(apiPaths.user + apiPaths.filter, { params: filters }),
  // getUsers: (params?) => axiosInstance.get(apiPaths.user),
  getUserDetails: (id) => axiosInstance.get(apiPaths.user + `/${id}`),
  getUserLogged: () => axiosInstance.get(apiPaths.user + apiPaths.me),
  setNewUser: (values) => axiosInstance.post(apiPaths.user, values),
  updateUser: (id, values) => axiosInstance.put(apiPaths.user + `/${ id }`, values),
  patchUser: (id, values) => axiosInstance.patch(apiPaths.user + `/${ id }`, values),
  getUserRoles: () => axiosInstance.get(apiPaths.role),
  getTsscManagers: () => axiosInstance.get(apiPaths.tsscManagers),
};
