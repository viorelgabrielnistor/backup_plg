import React, { FC, useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Field, Formik } from 'formik';
import * as Yup from 'yup';
import { useHistory } from 'react-router';

import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';

import useLoggedUserData from '../../store/useLoggedUserData';
import { getCustomSelectValue } from '../../helpers/formatForFields';
import CustomSelect from '../shared/fields/CustomSelect'
import SelectProjectType from './SelectProjectType';
import routePaths from '../../routes/routePaths';
import { IProjectDetails } from '../../services/projectInterface';
import { ICustomSelectOption } from '../shared/fields/CustomSelectInterface';
import { PROJECT_TYPES, SELECTED_PROJECT } from '../../constants/project';
import { toPath } from '../../helpers';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import useLocalStorage from '../../store/useLocalStorage';

import styles from './SelectProject.module.scss';

const SelectProject: FC<{}> = () => {
  const { loggedUserData: { allActiveProjects }, setCurrentProject } = useLoggedUserData();
  const [projects, setProjects] = useState<ICustomSelectOption[]>([]);
  const history = useHistory();
  const intl = useIntl();
  useDocumentTitle(intl.formatMessage({ id: 'label.page.selectProject' }));
  const [, setStoredSelectedProject] = useLocalStorage<string>(SELECTED_PROJECT, null );

  const hasChatProject = !!allActiveProjects?.chat.length;

  const validationSchema = Yup.object().shape({
    project: Yup.string().when('type', {
      is: PROJECT_TYPES.CASE,
      then: Yup.string().required(intl.formatMessage({ id: 'label.error.required' })),
    }),
  });

  useEffect(() => {
    if (allActiveProjects && allActiveProjects.case.length) {
      setProjects(allActiveProjects['case'][0].projects.map(({ id = '', name }) => getCustomSelectValue(name, id)));
    }
  }, [allActiveProjects]);

  return (
    <Formik
      initialValues={ { project: '', client: '', type: hasChatProject ? '' : PROJECT_TYPES.CASE } }
      validationSchema={ validationSchema }
      onSubmit={ (values) => {
        if (values.type === PROJECT_TYPES.CASE) {
          const allActiveCaseProjects = allActiveProjects?.case[0].projects;
          if (allActiveCaseProjects) {
            setCurrentProject(allActiveCaseProjects.find((project: IProjectDetails) => project.id === values.project) || null);
            setStoredSelectedProject(values.project)
            history.push(routePaths.agent.translation);
          }
        }
        if (values.type === PROJECT_TYPES.CHAT) {
          setCurrentProject(null);
          history.push(toPath(routePaths.agent.chat, { ticketId: '' }));
        }
      } }
    >
      {({
        values,
        handleSubmit,
        isSubmitting,
        touched,
        errors,
        setFieldValue
      }) => (
        <div className={ styles.mainContainer }>
          <div className={ styles.containerWrapper }>
            <Form onSubmit={ handleSubmit }>
              <h4 className="mb-4 text-center"><FormattedMessage id="label.translation.module"/></h4>
              {
                hasChatProject &&
                  <div className="mb-4">
                    <SelectProjectType onChange={ (type) => {
                      setFieldValue('type', type, false);
                      setFieldValue(
                        'project', 
                        allActiveProjects?.case.length === 1 && allActiveProjects?.case[0].projects.length === 1 ? 
                          allActiveProjects?.case[0].projects[0].id : 
                          '', 
                        false
                      );
                    } }
                    />
                  </div>
              }
              {values.type === PROJECT_TYPES.CASE && 
                <div className="mb-4">
                  <Field
                    name="project"
                    label={ intl.formatMessage({ id: 'label.translation.selectProject' }) }
                    component={ CustomSelect }
                    options={ projects }
                    placeholder={ intl.formatMessage({ id: 'label.select' }) }
                    isMulti={ false }
                    value={ values.project }
                    isInvalid={ !!touched.project && !!errors.project }
                  />
                </div>
              }

              <div className="text-center">
                <button type="submit" className={ `${ styles.button }` } disabled={ isSubmitting || (!values.type || (values.type === PROJECT_TYPES.CASE && !values.project)) } data-qa="start">
                  <FormattedMessage id="label.start" />
                  {
                    isSubmitting &&
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="ml-2"
                    />
                  }
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </Formik>
  );
};

export default SelectProject;
