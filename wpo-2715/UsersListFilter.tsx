import React, { FC, useState, useEffect, Dispatch } from 'react';
import { Button, Col, Row } from 'react-bootstrap';
import { FormattedMessage, useIntl } from 'react-intl';
import { Field, Form, Formik } from 'formik';

import CustomSelect from '../shared/fields/CustomSelect';
import { STATUS, USER_ROLES } from '../../constants';
import useLoggedUserData from '../../store/useLoggedUserData';
import useDebounce from '../../hooks/useDebounce';
import useGenericFetch from '../../hooks/useGenericFetch';
import { usersApi } from '../../api/usersApi';
import allUsersServices from '../../services/users';
import { IUserFiltersQuery, IUserFilterValues } from '../../services/usersInterface';
import InputField from '../shared/fields/InputField';
import ToggleButtonSimple from '../shared/fields/ToggleButtonSimple';
import { SEARCH_USERS_MAX_CHARS } from '../../constants/validation';
import { INITIAL_FILTERS } from '../../constants/user';
import { emptyFn } from '../../helpers';
import { hasRole } from '../../helpers/loggedUser';

import styles from './UsersListFilter.module.scss';

interface IUsersListFilter {
  setFilters: Dispatch<React.SetStateAction<IUserFilterValues>>;
  initialValues: IUserFilterValues;
  setInitialStatus: Dispatch<React.SetStateAction<STATUS>>;
}

const UsersListFilter: FC<IUsersListFilter> = ({ setFilters, initialValues, setInitialStatus }) => {
  const intl = useIntl();
  const [filtersQuery, setFiltersQuery] = useState<Partial<IUserFiltersQuery>>();
  const [statusFilter, setStatusFilter] = useState(initialValues.status);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [
    { clients, projects, roles, languagePairs },
    isLoadingFilters
  ] = useGenericFetch(usersApi.getFilters, allUsersServices.fromFilters.bind(allUsersServices, intl), initialValues, filtersQuery);
  const { loggedUserData: { role: loggedUserRole } } = useLoggedUserData();

  const handleStatusFilterChange = (status: STATUS): void => {
    setStatusFilter(status);
    setFilters((prevState) => ({ ...prevState , status }));
    setInitialStatus(status);
  };

  const handleFilterChange = (field: string, filterField: string, fetchFiltersValues: boolean) => {
    return (value: string): void => {
      if (fetchFiltersValues) {
        setFiltersQuery((prevFilters) => ({ ...prevFilters, [field]: value }));
      }

      setFilters((prevState) => ({ ...prevState, [filterField]: value, status: statusFilter }));
    }
  };

  const handleInputChange = (value: string): void => {
    setSearchTerm(value);
  };

  useEffect(() => {
    if (searchTerm && searchTerm.length >= SEARCH_USERS_MAX_CHARS) {
      setFilters((prevState) => ({ ...prevState, search: searchTerm, status: statusFilter }));
    } else {
      setFilters((prevState) => ({ ...prevState, search: '', status: statusFilter }));
    }
    // eslint-disable-next-line
  }, [debouncedSearchTerm]);

  return <Formik
    initialValues={ initialValues }
    onSubmit={ emptyFn }
  >
    {({
      values,
      resetForm
    }) => (
      <Form>
        <Row className="mb-4">
          <Col md={ 12 }>
            <label className={ `${ styles.label } mr-3` }>
              <FormattedMessage id="label.show" />
            </label>
            <ToggleButtonSimple
              options={ [
                { value: STATUS.ACTIVE, label: intl.formatMessage({ id: 'label.active' }) },
                { value: STATUS.INACTIVE, label: intl.formatMessage({ id: 'label.inactive' }) }
              ] }
              groupValue={ statusFilter }
              handleChange={ handleStatusFilterChange }
              className={ styles.filterToggle }
            />
          </Col>
        </Row>
        <Row>
          <Col className="pr-2">
            <div>
              <Field
                type="text"
                name="search"
                handleOnChange={ handleInputChange }
                component={ InputField }
                placeholder={ intl.formatMessage({ id: 'label.placeholder.userSearch' }) }
                label={ intl.formatMessage({ id: 'label.search' }) }
              />
            </div>
          </Col>
          {
            hasRole(loggedUserRole, [USER_ROLES.TSSC_MANAGER, USER_ROLES.ADMIN]) &&
            <Col className="pl-2 pr-2">
              <div>
                <Field
                  type="text"
                  name="clients"
                  value={ values.clients }
                  handleOnChange={ handleFilterChange('client', 'clients', true) }
                  component={ CustomSelect }
                  label={ intl.formatMessage({ id: 'label.table.client' }) }
                  placeholder={ intl.formatMessage({ id: 'label.select' }) }
                  options={ clients }
                  disabled={ isLoadingFilters }
                  isMulti
                />
              </div>
            </Col>
          }
          <Col className="pl-2 pr-2">
            <div>
              <Field
                type="text"
                name="projects"
                value={ values.projects }
                handleOnChange={ handleFilterChange('project', 'projects', true) }
                component={ CustomSelect }
                label={ intl.formatMessage({ id: 'label.table.project' }) }
                placeholder={ intl.formatMessage({ id: 'label.select' }) }
                options={ projects }
                disabled={ isLoadingFilters }
                isMulti
              />
            </div>
          </Col>
          <Col className="pl-2 pr-2">
            <div>
              <Field
                type="text"
                name="languagePairs"
                value={ values.languagePairs }
                handleOnChange={ handleFilterChange('languagePair', 'languagePairs', true) }
                component={ CustomSelect }
                label={ intl.formatMessage({ id: 'label.table.languagePair' }) }
                placeholder={ intl.formatMessage({ id: 'label.select' }) }
                options={ languagePairs }
                disabled={ isLoadingFilters }
                isMulti
              />
            </div>
          </Col>
          <Col className="pl-2 pr-2">
            <div>
              <Field
                type="text"
                name="roles"
                value={ values.roles }
                handleOnChange={ handleFilterChange('', 'roles', false) }
                component={ CustomSelect }
                label={ intl.formatMessage({ id: 'label.table.role' }) }
                placeholder={ intl.formatMessage({ id: 'label.select' }) }
                options={ roles }
                isMulti
              />
            </div>
          </Col>
          <Col className={ `${styles.filterButtonWrapper} pl-1` }>
            <Button
              className={ styles.actionLink }
              size="sm"
              variant="link"
              data-qa="clearFilter"
              onClick={ () => {
                resetForm();
                setFilters({ ...INITIAL_FILTERS, status: statusFilter });
                setFiltersQuery({});
              } }
            >
              <FormattedMessage id="label.button.clear" />
            </Button>
          </Col>
        </Row>
      </Form>
    )}
  </Formik>;
};

export default UsersListFilter;
