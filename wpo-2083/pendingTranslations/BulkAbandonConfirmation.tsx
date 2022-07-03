import React, { FC, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import Loader from '../shared/loader/Loader';
import Modal from 'react-bootstrap/Modal';
import styles from './BulkActionConfirmation.module.scss';
import { ABANDON_CONFIRMATION_TEXT } from '../../constants/pendingTranslations';

interface IBulkAbandonConfirmation {
  show: boolean;
  handleClose: () => void;
  handleYes: () => Promise<void>;
  isLoading?: boolean;
}

const BulkAbandonConfirmation: FC<IBulkAbandonConfirmation> = ({
  show,
  handleClose,
  handleYes,
  isLoading
}) => {
  const intl = useIntl();
  const [bulkConfirmation, setBulkConfirmation] = useState('');
  const [bulkConfirmationError, setBulkConfirmationError] = useState('');

  const resetForm = (): void => {
    setBulkConfirmation('');
    setBulkConfirmationError('');
  }

  const handleCloseClick = (): void => {
    resetForm();
    handleClose();
  }

  const checkIsValid = (): boolean => {
    if (!bulkConfirmation) {
      setBulkConfirmationError(intl.formatMessage({ id: 'label.error.required' }))
      return false;
    }
    if (bulkConfirmation.replace(/\s/g, '').toLowerCase() !== ABANDON_CONFIRMATION_TEXT) {
      setBulkConfirmationError(intl.formatMessage({ id: 'label.error.abandon' }))
      return false;
    }

    setBulkConfirmationError('')
    return true
  }

  const handleYesClick = async(): Promise<void> => {
    if (!checkIsValid()) {
      return;
    }

    await handleYes();
    resetForm();
  }

  return (
    <Modal
      show={ show }
      onHide={ handleCloseClick }
      centered
      className={ styles.modal }
      dialogClassName={ styles.wrapper }
      backdropClassName={ styles.backdrop }
    >
      <div className="px-4">
        <div className={ `${ styles.title } text-center mb-2` }><FormattedMessage id="label.confirmationAbandonTickets" /></div>
        <p className="pb-2"><FormattedMessage id="label.confirmationAbandonTicketsBulk" /></p>

        <textarea
          className={ `form-control ${ styles.textarea } ${ bulkConfirmationError ? 'is-invalid' : '' }` }
          value={ bulkConfirmation }
          onChange={ (e) => setBulkConfirmation(e.target.value) }
          onBlur={ checkIsValid }
        />
        { bulkConfirmationError && <span className="text-danger">{ bulkConfirmationError }</span> }

        <div className="d-flex justify-content-between mt-4">
          <button className={ styles.buttonNo } type="button" onClick={ handleCloseClick } data-qa="noModal">
            <FormattedMessage id="label.no" />
          </button>
          <button className={ styles.buttonYes } type="button" onClick={ handleYesClick } data-qa="yesModal">
            <FormattedMessage id="label.yes" />
            {
              isLoading && <Loader small />
            }
          </button>
        </div>
      </div>
    </Modal>
  );
}
export default BulkAbandonConfirmation;
