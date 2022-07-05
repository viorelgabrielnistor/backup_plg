import React, { FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Button } from 'react-bootstrap';

import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import Form from 'react-bootstrap/Form';
import useIsMountedRef from '../../hooks/useIsMountedRef';
import useLocalStorage from '../../store/useLocalStorage';
import { SELECTED_PROJECT } from '../../constants/project';
import useLoggedUserData from '../../store/useLoggedUserData';

import styles from './TranslationResultConfirmedModal.module.scss';

export interface ITranslationResultConfirmedModalProps {
  show: boolean;
  hasConfidenceScore: boolean;
  ticketId: string;
  ticketUrl: string;
  handleYes: () => Promise<void>;
  handleClose: () => void;
}

const TranslationResultConfirmedModal: FC<ITranslationResultConfirmedModalProps> = ({
  show, ticketId, ticketUrl, handleYes, handleClose, hasConfidenceScore
}) => {
  const intl = useIntl();
  const isMountedRef = useIsMountedRef();
  const [storedSelectedProject,] = useLocalStorage<string>(SELECTED_PROJECT, '');
  const { loggedUserData: { allActiveProjects }, setCurrentProject } = useLoggedUserData();
  const selectedProjectFromLocalStorage = allActiveProjects!['case'][0].projects.filter(project => project.id === storedSelectedProject); 

  const validationSchema = Yup.object().shape({
    ticketId: Yup.string()
      .required(intl.formatMessage({ id: 'label.error.required' }))
  });

  return (
    <Modal show={ show } backdrop="static" size="lg" centered={ true } dialogClassName={ styles.wrapper }>
      <div className="text-center">
        <span className={ styles.textIcon } />
      </div>
      <Modal.Header>
        <Modal.Title className={ styles.title }><FormattedMessage id="label.translation.copied" /></Modal.Title>
      </Modal.Header>
      <Modal.Body className={ styles.body }>
        { hasConfidenceScore &&
              <div><FormattedMessage id="label.translationResult.hasConfidence" /></div>
        }
        <FormattedMessage id="label.translation.copiedText" />
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between text-center">
        <Formik
          initialValues={ { ticketId: '' } }
          validationSchema={ validationSchema }
          onSubmit={ async (values, { setSubmitting }) => {
            try {
              await handleYes();
              handleClose();
              setCurrentProject(selectedProjectFromLocalStorage[0])
            } catch (e) {
              console.error(e);
            } finally {
              isMountedRef.current && setSubmitting(false);
            }
          } }
        >
          { ({
            handleSubmit,
            handleChange,
            handleBlur,
            isSubmitting,
            touched,
            errors
          }) =>
            (
              <Form onSubmit={ handleSubmit } className="container-fluid">
                <Form.Check
                  id="ticketId"
                  type="checkbox"
                  className={ styles.checkboxWrapper }
                >
                  <Form.Check.Label className={ styles.checkboxLabel }>
                    <FormattedMessage 
                      id="label.translation.ticketResolved"
                      values={ { value: <span title={ ticketId ? '' : ticketUrl } className={ `font-weight-bold ${styles.ticketIdentifier}` }> {ticketId ? ticketId : ticketUrl} </span> } }
                    />

                  </Form.Check.Label>
                  <label className={ styles.customCheckbox } >
                    <Form.Check.Input
                      type="checkbox"
                      name="ticketId"
                      onChange={ handleChange }
                      onBlur={ handleBlur }
                    />
                    <span></span>
                  </label>
                </Form.Check>
                { !!touched.ticketId && !!errors.ticketId &&
                  <div className="text-danger">
                    { errors.ticketId }
                  </div>
                }

                <div className="d-flex justify-content-between pt-4">
                  <Button variant="link" onClick={ handleClose } data-qa="backModal" className={ styles.actionLink }>
                    <FormattedMessage id="label.back" />
                  </Button>
                  <button
                    type="submit"
                    disabled={ isSubmitting }
                    data-qa="closeTicket"
                    className={ styles.buttonSubmit }
                  >
                    <FormattedMessage id="label.translation.newTranslation" />
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
            ) }
        </Formik>
      </Modal.Footer>
    </Modal>
  );
};

export default TranslationResultConfirmedModal;
