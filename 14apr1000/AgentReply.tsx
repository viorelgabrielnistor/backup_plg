import React, { FC, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useFormikContext } from 'formik';
import cloneDeep from 'lodash/cloneDeep';
import { toast } from 'react-toastify';
import { useHistory } from 'react-router';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

import { ReactComponent as Verified } from '../../../../assets/images/Verified.svg';
import { ReactComponent as Pending } from '../../../../assets/images/PendingVerification.svg';
import { ReactComponent as Rejected } from '../../../../assets/images/Rejected.svg';
import { ReactComponent as MachineTranslated } from '../../../../assets/images/MachineTranslated.svg';
import { ReactComponent as EditIcon } from '../../../../assets/images/Edit.svg';

import EditReply from './EditReply';
import RejectReply from './RejectReply';
import Loader from '../../../shared/loader/Loader';

import { ICustomSelectOption } from '../../../shared/fields/CustomSelectInterface';
import { STATUS_TYPE } from '../../../../constants/translation';
import pendingTicket, { IPendingTicket, IPendingTranslation } from '../../../../services/pendingTicket';
import routePaths from '../../../../routes/routePaths';
import useIsMountedRef from '../../../../hooks/useIsMountedRef';
import useContainerWidth from '../../../../hooks/useContainerWidth';
import { removeNewLines } from '../../../../helpers';

import styles from './AgentReply.module.scss';

interface IAgentReply {
  index: number;
  replace: (index: number, value: IPendingTranslation) => void;
  isLastPending: boolean;
  resolveTicket: (ticket: IPendingTicket) => Promise<void>;
  isLoadingResolve: boolean;
  rejectionCategories: ICustomSelectOption[] | null;
}

const AgentReply: FC<IAgentReply> = ({ index, replace, isLastPending, resolveTicket, isLoadingResolve, rejectionCategories }) => {
  const intl = useIntl();
  const history = useHistory();
  const isMountedRef = useIsMountedRef();

  const { values, validateForm } = useFormikContext<IPendingTicket>();
  const translation = values.translations[index];
  const { status, translatedText, originalText, rejectionCategory, rejectionReason } = translation;

  const firstPendingIndex = useMemo(() => {
    return values.translations.findIndex((translation) =>
      translation.status === STATUS_TYPE.PENDING_VERIFICATION && translation.isEditable
    );
  }, [values]);
  const isFirstPending = index === firstPendingIndex;
  const statusIconType = useMemo(() => (
    {
      [STATUS_TYPE.MACHINE_TRANSLATED]:
        <MachineTranslated className="mr-1" />,
      [STATUS_TYPE.PENDING_VERIFICATION]:
        <Pending className="mr-1" />,
      [STATUS_TYPE.VERIFIED]:
        <Verified className="mr-1" />,
      [STATUS_TYPE.REJECTED]: 
        <Rejected className="mr-1" />,
    })[status], [status]);

  const [ editMode, setEditMode ] = useState(false);
  const [ rejectMode, setRejectMode ] = useState(false);

  const handleSubmit = async(
    saveValues: IPendingTicket,
    submitCallback: (data: IPendingTicket) => Promise<void>,
    redirect: boolean,
    successMessageLabel: string
  ): Promise<void> => {

    const validation = await validateForm(saveValues);

    if (!validation || Object.keys(validation).length === 0) {
      await submitCallback(pendingTicket.toChat(saveValues));

      isMountedRef.current && replace(index, {
        ...saveValues.translations[index]
      });
      toast.success(intl.formatMessage({ id: successMessageLabel }));

      if (redirect) {
        history.push(routePaths.languageExpert.startTranslation);
      }
    } else {
      throw new Error();
    }
  };

  const handleOk = async(isLastPending: boolean): Promise<void> => {
    const saveValues: IPendingTicket = cloneDeep(values);
    saveValues.translations[index] = {
      ...saveValues.translations[index],
      translatedTextCopy: translatedText,
      status: STATUS_TYPE.VERIFIED,
      metadata: [{
        metadataId: values.qualityAssessmentMetadata.id,
        name: values.qualityAssessmentMetadata.name,
        options: [values.qualityAssessmentMetadata.options[0]]
      }]
    };
    await handleSubmit(saveValues, resolveTicket, isLastPending, 'label.translation.verifySuccess');

    isMountedRef.current && setEditMode(false);
  };

  const handleTextClick = (): void => {
    if (status === STATUS_TYPE.PENDING_VERIFICATION && isFirstPending && !rejectMode) {
      setEditMode(true);
    }
  };

  const [messageRef, messageWidth] = useContainerWidth();

  return (
    <div className={ `${ styles.agentReplyWrapper }` }>
      <div className={ `${ styles.agentReply } ${ rejectMode ? styles.rejected : isFirstPending ? styles.firstPending : styles[status]}` }>
        <div className="d-flex justify-content-between align-items-center flex-grow-1">
          { !isFirstPending &&
            <span className={ `${ styles.details } ${ styles.status } mr-4` }>
              { statusIconType }
              <FormattedMessage id={ `label.chat.${ status === STATUS_TYPE.PENDING_VERIFICATION ? 'pending' : status }` } />
              { status === STATUS_TYPE.REJECTED && rejectionCategory &&
                <>
                  <OverlayTrigger
                    placement="bottom"
                    overlay={ <Tooltip id={ `tooltipRejectionCategory` }>
                      { rejectionCategory }
                    </Tooltip> }
                  >
                    <span className={ styles.rejectionData }>{ rejectionCategory }</span>
                  </OverlayTrigger>
                  <OverlayTrigger
                    placement="bottom"
                    overlay={ <Tooltip id={ `tooltipRejectionReason` }>
                      <div className={ styles.tooltip }>
                        { rejectionReason }
                      </div>
                    </Tooltip> }
                  >
                    <span className={ styles.rejectionData }>&quot;{ removeNewLines(rejectionReason) }&quot;</span>
                  </OverlayTrigger>
                </>
              }
            </span>
          }
        </div>
        <div ref={ messageRef }>
          { editMode ?
            <EditReply
              index={ index }
              metadata={ values.qualityAssessmentMetadata }
              handleSubmit={ handleSubmit }
              setEditMode={ setEditMode }
              isLastPending={ isLastPending }
              resolveTicket={ resolveTicket }
              isLoadingResolve={ isLoadingResolve }
              messageWidth={ messageWidth }
            />
            :
            <>
              <div className={ `${ styles.translation } ${ isFirstPending && !rejectMode ? styles.editable : '' }` } onClick={ handleTextClick }>
                { isFirstPending && !rejectMode &&
                  <span className={ styles.editIconWrapper }><EditIcon className={ styles.editIcon } /></span>
                }
                { translatedText ? translatedText : <FormattedMessage id="label.chat.deletedMessage" /> }
              </div>
              {
                originalText &&
                <div className={ styles.original }>{ originalText }</div>
              }
              {
                !!rejectionCategories?.length && rejectMode &&
                <RejectReply
                  index={ index }
                  handleSubmit={ handleSubmit }
                  replace={ replace }
                  setRejectMode={ setRejectMode }
                  rejectionCategories={ rejectionCategories }
                />
              }
            </>
          }
        </div>
      </div>
      { isFirstPending && !editMode && !rejectMode &&
        <div className={ styles.actions }>
          <button
            className={ `${ styles.ok } ${ styles.actionButton }` }
            type="button"
            onClick={ () => handleOk(isLastPending) }
            data-qa="verifyOk"
            disabled={ isLoadingResolve }
          >
            <FormattedMessage id={ `label.${ isLastPending ? 'ticket.okFinish' : 'ok' }` } />
            { isLoadingResolve && <Loader small /> }
          </button>
          { rejectionCategories === null ?
            <div className={ styles.reject }><Loader small /></div>
            :
            !!rejectionCategories?.length &&
              <button
                className={ `${styles.reject} ${styles.rejectLink} ${styles.actionButton}` }
                type="button"
                onClick={ () => setRejectMode(true) }
                data-qa="verifyReject"
              >
                <FormattedMessage id="label.ticket.reject"/>
              </button>
          }
        </div>
      }
    </div>
  );
};

export default AgentReply;
