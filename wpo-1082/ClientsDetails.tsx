import React, { FC, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { toast } from 'react-toastify';
import { FormattedMessage, useIntl } from 'react-intl';
import { Field, Formik } from 'formik';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';

import useClientDetails from '../../hooks/useClientDetails';
import useIsMountedRef from '../../hooks/useIsMountedRef';
import useLanguages from '../../store/useLanguages';
import useLoggedUserData from '../../store/useLoggedUserData';
import { IClientValues } from '../../services/clientInterface';
import { IProjectValues } from '../../services/projectInterface';
import clientService from '../../services/client';
import { clientsApi } from '../../api/clientsApi';
import routePaths from '../../routes/routePaths';
import handleErrors from '../../helpers/handleErrors';
import { toPath } from '../../helpers';
import ProjectCard from './ProjectCard';
import ConfirmationModal from '../shared/confirmationModal/confirmationModal';
import InputField from '../shared/fields/InputField';
import ToggleButton from '../shared/fields/ToggleButton';
import CustomTextArea from '../shared/fields/CustomTextArea';
import { clientValidationSchema } from './validationSchema';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { VALIDATION_MAX_CHARS_TEXTAREA } from '../../constants/validation';

import styles from './ClientDetails.module.scss';

const ClientsDetails: FC<{}> = () => {
  const intl = useIntl();
  const history = useHistory();
  console.log(history)
  const isMountedRef = useIsMountedRef();
  const [, isLoadingLanguages, , , getLanguageName] = useLanguages();
  const { getAllUserDetails } = useLoggedUserData();

  const { clientId } = useParams<{clientId: string}>();
  const [ client, setClient, , , isLoading ] = useClientDetails(clientId || '');

  const hasFormChanged = (values): boolean => JSON.stringify(client) !== JSON.stringify(values);

  const [ isModalOpen, setIsModalOpen ] = useState(false);
  const handleCloseModal: () => void = () => {
    setIsModalOpen(false);
  };
  const handleCancelConfirmation: () => void = () => {
    handleCloseModal();
    history.push(
      {
        pathname: routePaths.admin.clients,
        state: history.location.state
      }
    )
  };
  const handleCancel: (values: IClientValues) => void = (values) => {
    if (hasFormChanged(values)) {
      setIsModalOpen(true);
    } else {
      handleCancelConfirmation();
    }

    return;
  };

  const handleAddProject = (): void => {
    history.push(toPath(routePaths.admin.project, { clientId: clientId || '' }));
  };

  useDocumentTitle(intl.formatMessage({ id: 'label.page.clientEdit' }));

  return (
    <>
      {
        isLoading || isLoadingLanguages ? (
          <Spinner animation="border" />
        ) : (
          <Formik
            initialValues={ client }
            validationSchema={ clientValidationSchema(intl) }
            onSubmit={ async (values, { setSubmitting, setFieldError }) => {
              try {
                if (clientId) {
                  await clientsApi.updateClient(clientId, clientService.to(values));
                  await getAllUserDetails();
                  setClient(values);
                  toast.success(intl.formatMessage({ id: 'label.success.changes' }));
                }
              } catch (e) {
                handleErrors(intl, e, setFieldError);
              } finally {
                isMountedRef.current && setSubmitting(false);
              }
            } }
          >
            {({
              values,
              handleChange,
              handleSubmit,
              isSubmitting,
              touched,
              errors
            }) => (
              <>
                <Form onSubmit={ handleSubmit }>
                  <div className={ styles.clientNameWrapper }>
                    <div className={ styles.inputWrapper }>
                      <Field
                        type="text"
                        name="name"
                        label={ intl.formatMessage({ id: 'label.client.name' }) }
                        value={ values.name }
                        onChange={ handleChange }
                        component={ InputField }
                        isInvalid={ !!touched.name && !!errors.name }
                        placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                        isRequired
                      />
                    </div>
                    <div className={ styles.clientStatus }>
                      { clientId ?
                        <div className={ styles.headClientStatus }>
                          <Field
                            name="active"
                            label={ intl.formatMessage({ id: 'label.client.status' }) }
                            value={ values.active }
                            component={ ToggleButton }
                            buttonValues={ [
                              {
                                label: intl.formatMessage({ id: 'label.active' }),
                                value: 1
                              },
                              {
                                label: intl.formatMessage({ id: 'label.inactive' }),
                                value: 0
                              }
                            ] }
                            isInvalid={ !!touched.active && !!errors.active }
                          />
                        </div>
                        :
                        <>
                          <label className="font-weight-bold mr-1">
                            <FormattedMessage id="label.status"/>:
                          </label>
                          <FormattedMessage id="label.active"/>
                        </>
                      }
                    </div>
                  </div>

                  <div className={ styles.assignedProjects }>
                    <p><FormattedMessage id="label.projects.assigned"/></p>
                  </div>

                  <div className={ styles.projectBlockWrapper }>
                    {
                      values.projects.length ?
                        values.projects.map((project: IProjectValues, index) => (
                          <ProjectCard
                            key={ index }
                            clientId={ clientId || '' }
                            details={ project }
                            getLanguageName={ getLanguageName }
                          />
                        ))
                        :
                        <p className={ styles.noProjects }><FormattedMessage id="label.projects.empty" /></p>
                    }
                  </div>
                  <button
                    type="button"
                    className={ styles.addNewProjectBtn }
                    onClick={ handleAddProject }
                    data-qa="addProject"
                  >
                    <FormattedMessage id="label.projects.add" />
                  </button>

                  <div className={ styles.assignedProjects }>
                    <p><FormattedMessage id="label.projects.powerBiDashboard"/></p>
                  </div>

                  <Field
                    name="dashboardUrl"
                    onChange={ handleChange }
                    component={ CustomTextArea }
                    placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                    description={ intl.formatMessage({ id: 'label.textarea.max' }, { value: VALIDATION_MAX_CHARS_TEXTAREA }) }    
                    rows={ 3 }
                    isInvalid={ !!touched.dashboardUrl && !!errors.dashboardUrl }
                  />

                  <div className="d-flex justify-content-between mt-5">
                    <button
                      type="button"
                      className={ styles.cancelBtn }
                      onClick={ () => { handleCancel(values) } }
                      data-qa="cancel"
                    >
                      <FormattedMessage id={ hasFormChanged(values) ? 'label.cancel' : 'label.back' } />
                    </button>
                    <button className={ styles.saveBtn } type="submit" disabled={ isSubmitting } data-qa="submit">
                      <FormattedMessage id="label.saveChanges" />
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
                <ConfirmationModal
                  show={ isModalOpen }
                  handleClose={ handleCloseModal }
                  handleYes={ handleCancelConfirmation }
                  title={ intl.formatMessage({ id: 'label.confirmationTitle' }) }
                  text={ intl.formatMessage({ id: 'label.confirmationText' }) }
                />
              </>
            )}
          </Formik>
        )
      }
    </>
  );
};

export default ClientsDetails;
