import React, { FC, useEffect, useMemo, useState } from 'react';
import { Field, FormikErrors, FormikTouched } from 'formik';
import { toast } from 'react-toastify';
import { useIntl } from 'react-intl';

import CustomSelect from '../shared/fields/CustomSelect';
import { ICustomSelectOption } from '../shared/fields/CustomSelectInterface';
import { IUserFormValues } from '../../services/usersInterface';
import { IClientDetails } from '../../services/clientInterface';
import { IProjectDisplay } from './UserDetails';
import ProjectList, { IExtendedProjectDisplay } from './ProjectList';
import ToggleButtonSimple from '../shared/fields/ToggleButtonSimple';
import Spinner from 'react-bootstrap/Spinner';
import useLoggedUserData from '../../store/useLoggedUserData';
import { hasRole, isTeamLeadOrOpsManager } from '../../helpers/loggedUser';
import { USER_ROLES } from '../../constants';
import useGenericFetch from '../../hooks/useGenericFetch';
import useIsNotFirstRender from '../../hooks/useIsNotFirstRender';
import { usersApi } from '../../api/usersApi';
import allUsersServices from '../../services/users';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

import styles from './UserDetails.module.scss';

interface ILanguageExpertDetailsProps {
  errors: FormikErrors<IUserFormValues>;
  touched: FormikTouched<IUserFormValues>;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean | undefined) => any;
  languageOptions: ICustomSelectOption[];
  isLoadingLanguages: boolean;
  clients: ICustomSelectOption[];
  tsscClients: ICustomSelectOption[];
  projects: IExtendedProjectDisplay[];
  selectedProjects: ICustomSelectOption[];
  values: IUserFormValues;
  handleHasSpecificClients: (hasSpecificClients: boolean) => void;
}

const LanguageExpertDetails: FC<ILanguageExpertDetailsProps> = ({
  errors,
  touched,
  setFieldValue,
  languageOptions,
  isLoadingLanguages,
  clients,
  tsscClients,
  projects,
  selectedProjects,
  values,
  handleHasSpecificClients
}) => {
  const intl = useIntl();
  const isNotFirstRender = useIsNotFirstRender();
  const { loggedUserData: { role: loggedUserRole, allClients: loggedUserClients, allActiveProjects } } = useLoggedUserData();
  const hasSupervisors = useMemo(() => !!values.supervisors.length, [values.supervisors]);
  const [ hasAllClients, setHasAllClients ] = useState(values.clients.length === 0 && !hasSupervisors);
  const clientsOptions = useMemo(() => (
    !hasSupervisors || loggedUserRole === USER_ROLES.TSSC_MANAGER ?
      clients :
      tsscClients
  ), [hasSupervisors, loggedUserRole, clients, tsscClients]);
  const hasTsscRights = hasRole(loggedUserRole, [USER_ROLES.ADMIN, USER_ROLES.TSSC_MANAGER]);
  const [ tsscManagers, isLoadingTsscManagers ] = useGenericFetch(
    usersApi.getTsscManagers.bind(usersApi),
    allUsersServices.fromTsscManagers.bind(allUsersServices),
    null,
    null,
    hasTsscRights
  );
  const tsscManagersOptions = useMemo(() => tsscManagers ? allUsersServices.getSupervisorsOptions(tsscManagers) : [], [tsscManagers]);

  const isClientsDisabled = isTeamLeadOrOpsManager(loggedUserRole) &&
    (Array.isArray(values.clients)
      ? values.clients.length === 1 && values.clients[0].value === loggedUserClients[0].id
      : !!values.clients.value && values.clients.value === loggedUserClients[0].id
    );

  useEffect(() => {
    handleHasSpecificClients(!hasAllClients);
    // eslint-disable-next-line
  }, [hasAllClients]);

  useEffect(() => {
    setFieldValue('assignedProjects', selectedProjects.filter((project: ICustomSelectOption) => {
      return !!projects.find((prj: IProjectDisplay) => prj.id === project.value)
    }));
    // eslint-disable-next-line
  }, [projects.length]);

  useEffect(() => {
    if (loggedUserRole === USER_ROLES.ADMIN && isNotFirstRender) {
      if (hasSupervisors) {
        setHasAllClients(false);
        const clientsArray = Array.isArray(values.clients) ? values.clients : [values.clients];
        setFieldValue('clients', clientsArray.filter((client: ICustomSelectOption) => {
          return !!tsscClients.find((tsscClient: ICustomSelectOption) => tsscClient.value === client.value)
        }));
      } else {
        setHasAllClients(true);
        setFieldValue('clients', []);
      }
    }
    // eslint-disable-next-line
  }, [hasSupervisors]);

  const handleAllClientsChange = (): void => {
    if (!hasAllClients) {
      setFieldValue('clients', []);
    }
    setHasAllClients(!hasAllClients);
  };

  const handleValidateChange = (selectedClients: string | string[]): boolean => {
    if (isTeamLeadOrOpsManager(loggedUserRole)) {
      const selectedClientsArray = Array.isArray(selectedClients) ? selectedClients : [selectedClients];
      const currentClientsArray = Array.isArray(values.clients) ? values.clients : [values.clients];

      if ((selectedClientsArray.length > currentClientsArray.length
          && selectedClientsArray[selectedClientsArray.length - 1] === loggedUserClients[0].id
      ) || (selectedClientsArray.length < currentClientsArray.length
          && !selectedClientsArray.find((client) => client === loggedUserClients[0].id)
          && currentClientsArray.find((client) => client.value === loggedUserClients[0].id)
      )
      ) {
        return true;
      } else {
        toast.warn(intl.formatMessage({ id: 'label.user.onlyAssignedClients' }));
        return false;
      }
    }
    return true;
  };

  const allActiveProjectsBothType: IClientDetails[]| null = allActiveProjects && [...allActiveProjects?.case, ...allActiveProjects?.chat];
  projects.forEach(project => {
    allActiveProjectsBothType?.filter(activeProject => {
      activeProject.projects.forEach(elem => {
        if (elem.name === project.name) {
          const man: string[] = elem.workflows;
          project['supervisedProject'] = man?.includes('supervised');
        }
      })
    });
  })
  const filteredProjects: IExtendedProjectDisplay[] = [...projects];

  return (
    <>
      {
        isLoadingLanguages || isLoadingTsscManagers ?
          <Spinner animation="border" />
          :
          <>
            <div className="mb-4 w-50">
              { (loggedUserRole === USER_ROLES.ADMIN || loggedUserRole === USER_ROLES.TSSC_MANAGER) &&
                <Field
                  component={ CustomSelect }
                  name="supervisors"
                  options={ tsscManagersOptions }
                  isMulti
                  valueAsObject
                  placeholder={ intl.formatMessage({ id: 'label.select' }) }
                  label={ intl.formatMessage({ id: 'label.role.tsscManager' }) }
                  isInvalid={ !!touched.supervisors && !!errors.supervisors }
                />
              }
            </div>
            <div className="mb-4 w-50">
              <Field
                component={ CustomSelect }
                name="languageQueues"
                options={ languageOptions }
                isMulti
                valueAsObject
                placeholder={ intl.formatMessage({ id: 'label.select' }) }
                label={ intl.formatMessage({ id: 'label.languageQueue' }) }
                isRequired
                isInvalid={ !!touched.languageQueues && !!errors.languageQueues }
              />
            </div>

            <div className="w-50">
              <label className={ `${ styles.label } ${ styles.required }` }>{intl.formatMessage({ id: 'label.clients' })}</label>
              {
                isTeamLeadOrOpsManager(loggedUserRole) && hasAllClients ? (
                  <OverlayTrigger placement="right" overlay={ <Tooltip id="tooltip-disabled" className="mb-4">
                    { intl.formatMessage({ id: 'label.user.contactAdmin' }) }
                  </Tooltip> }>
                    <span className="d-inline-block">
                      <ToggleButtonSimple
                        options={ [
                          { value: true, label: intl.formatMessage({ id: 'label.client.all' }) },
                          { value: false, label: intl.formatMessage({ id: 'label.client.specific' }) }] }
                        groupValue={ hasAllClients }
                        handleChange={ handleAllClientsChange }
                        isDisabled={ isTeamLeadOrOpsManager(loggedUserRole) && hasAllClients  }
                      />
                    </span>
                  </OverlayTrigger>
                ) : loggedUserRole === USER_ROLES.ADMIN && !hasSupervisors && (
                  <ToggleButtonSimple
                    className="mb-4"
                    options={ [
                      { value: true, label: intl.formatMessage({ id: 'label.client.all' }) },
                      { value: false, label: intl.formatMessage({ id: 'label.client.specific' }) }] }
                    groupValue={ hasAllClients }
                    handleChange={ handleAllClientsChange }
                  />
                )
              }
            </div>
            {
              (!hasAllClients || loggedUserRole === USER_ROLES.TSSC_MANAGER || hasSupervisors)  &&
              <>
                <div className="mb-4 w-50">
                  <Field
                    component={ CustomSelect }
                    name="clients"
                    options={ clientsOptions }
                    handleValidateChange={ handleValidateChange }
                    isMulti
                    valueAsObject
                    placeholder={ intl.formatMessage({ id: 'label.select' }) }
                    disabled={ isClientsDisabled }
                    isInvalid={ !!touched.clients && !!errors.clients }
                  />
                </div>
                <ProjectList
                  projects={ filteredProjects }
                  selectedProjects={ selectedProjects }
                  isInvalid={ !!touched.assignedProjects && !!errors.assignedProjects }
                  hasAssign={ false }
                />
              </>
            }
          </>
      }
    </>
  );
};

export default LanguageExpertDetails;
