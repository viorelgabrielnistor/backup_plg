import React, { FC, useEffect, useState } from 'react';
import useUsers from '../../hooks/useUsers';
import { useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { toast } from 'react-toastify';

import Table from 'react-bootstrap/Table';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

import routePaths from '../../routes/routePaths';
import useLoadingQue from '../../hooks/useLoadingQue';
import { IUserFilterValues, IUserList } from '../../services/usersInterface';
import allUsersServices from '../../services/users';
import patchValue from '../../helpers/patchValue';
import extractErrorTexts from '../../helpers/extractErrorText';
import { emptyFn, toPath } from '../../helpers';
import useLoggedUserData from '../../store/useLoggedUserData';
import { ISortData, SortableTh, SortableThead } from '../shared/sortingTable/SortingTable';
import Loader from '../shared/loader/Loader';
import UsersListFilter from './UsersListFilter';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import styles from './UsersListing.module.scss';
import { SORT_DIRECTION, STATUS } from '../../constants';
import { INITIAL_FILTERS, INITIAL_SORT } from '../../constants/user';

const UsersListing: FC<{}> = () => {
  const [addToLoadingQue, removeFromLoadingQue, isInLoadingQue] = useLoadingQue();
  const [usersForDisplay, setUsersForDisplay] = useState<IUserList[] | null>(null);
  const [users, isLoadingUsers, getUsers, toggleUser] = useUsers();
  const [filters, setFilters] = useState<IUserFilterValues>(INITIAL_FILTERS);
  const [sorting, setSorting] = useState<ISortData>(INITIAL_SORT);
  const history = useHistory();
  const location = useLocation();
  const intl = useIntl();
  const { loggedUserData: { id: currentUserId }
  } = useLoggedUserData();
  useDocumentTitle(intl.formatMessage({ id: 'label.page.users' }));

  useEffect(
    () => {
      getUsers(allUsersServices.toFilterQuery(filters, sorting));
      // eslint-disable-next-line
    }, [JSON.stringify(filters), JSON.stringify(sorting)]);

  useEffect(() => {
    if (users) {
      setUsersForDisplay(allUsersServices.transformUser(users, intl));
    }
  }, [users, intl]);

  const handleSortChange = (column: string, direction: SORT_DIRECTION): void => {
    setSorting({ column, direction });
  };

  const handleStatusChange = async (userId: string, active: boolean): Promise<void> => {
    if (userId) {
      try {
        addToLoadingQue(userId);
        await toggleUser(userId, patchValue.getActiveStatusValue(`${ !active }`));
        getUsers(allUsersServices.toFilterQuery(filters, sorting));
        toast.success(intl.formatMessage({ id: 'label.success.status' }));
      } catch (error) {
        extractErrorTexts(error).forEach(e => toast.error(e));
      } finally {
        removeFromLoadingQue(userId);
      }
    }
  };

  const initialStatusFilter = location.state === STATUS.INACTIVE ? STATUS.INACTIVE : STATUS.ACTIVE;
  const [initialStatus, setInitialStatus] = useState(initialStatusFilter);
  const updatedInitialFilters: IUserFilterValues = {
    ...INITIAL_FILTERS,
    status: location.state === STATUS.INACTIVE ? STATUS.INACTIVE : STATUS.ACTIVE
  }

  const handleRedirect = ({ pathname, state }): void => {
    history.push({ pathname, state });
  };

  const renderTooltip = (name: string, content: React.ReactNode): React.ReactNode => (
    <OverlayTrigger
      key={ name }
      placement="bottom"
      overlay={ <Tooltip id={ `tooltip-${name}` }>
        <FormattedMessage id={ 'label.user.contactSupervisor' } />
      </Tooltip> }
    >
      { content }
    </OverlayTrigger>
  );

  return (
    <>
      <Row>
        <Col md={ 6 } className={ styles.titleWrapper }>
          <h1>{ intl.formatMessage({ id: 'label.users' }) }</h1>
        </Col>
        <Col className="text-right" md={ 6 }>
          <button
            className={ `ml-n3 ${ styles.button }` }
            type="button"
            onClick={ () => handleRedirect({
              pathname: routePaths.admin.userNew,
              state: initialStatus
            }) }
          >
            <FormattedMessage id="label.button.addNewUsers" />
          </button>
        </Col>
      </Row>

      <UsersListFilter
        setFilters={ setFilters }
        initialValues={ updatedInitialFilters }
        setInitialStatus={ setInitialStatus }
      />

      <Row>
        <Col md={ 12 }>
          {
            usersForDisplay && usersForDisplay.length > 0 ?
              (
                <Table className={ `mx-auto mt-5 ${ styles.table }` }>
                  <SortableThead initialSortColumn={ INITIAL_SORT.column } initialSortDirection={ INITIAL_SORT.direction } onSort={ handleSortChange }>
                    <tr>
                      <th className={ `align-middle ${styles.numberCol}` }>#</th>
                      <SortableTh className={ `align-middle ${styles.nameCol}` } column="firstName">
                        <FormattedMessage id="label.table.firstName" />
                      </SortableTh>
                      <SortableTh className="align-middle" column="lastName">
                        <FormattedMessage id="label.table.lastName" />
                      </SortableTh>
                      <SortableTh className="align-middle" column="email">
                        <FormattedMessage id="label.table.email" />
                      </SortableTh>
                      <th className="align-middle text-center">
                        <FormattedMessage id="label.table.status" />
                      </th>
                      <SortableTh className="align-middle" column="role.name">
                        <FormattedMessage id="label.table.role" />
                      </SortableTh>
                      <th className="align-middle">
                        <FormattedMessage id="label.table.client" />
                      </th>
                      <th className="align-middle">
                        <FormattedMessage id="label.project" />
                      </th>
                      <th className="align-middle">
                        <FormattedMessage id="label.languagePairs" />
                      </th>
                      <th className="align-middle text-center">
                        <FormattedMessage id="label.table.actions" />
                      </th>
                    </tr>
                  </SortableThead>
                  <tbody>
                    {
                      usersForDisplay.map(({
                        id, firstName, lastName, email, role, clients,
                        active, assignedProjects, languageQueues, editable }, index) => {

                        return (
                          <tr key={ index }>
                            <td className={ styles.numCol }>{ index + 1 }</td>
                            <td>{ firstName }</td>
                            <td>{ lastName }</td>
                            <td>
                              <div title={ email } className={ styles.userEmail }>
                                {email}
                              </div>
                            </td>
                            <td className={ `text-center ${ styles.status } ${ !active ? styles.statusInactive : '' }` }>
                              <FormattedMessage id={ `label.${ active ? 'active' : 'inactive' }` } />
                            </td>
                            <td>{role}</td>
                            <td className="text-break">{ clients }</td>
                            <td className="text-break">{ assignedProjects }</td>
                            <td>{ languageQueues } </td>
                            <td className="align-middle text-center">
                              <div className={ styles.editColumnWrapper }>
                                {
                                  editable ? (
                                    <>
                                      <Button
                                        className={ `p-0 pr-2 ${styles.actionLink}` }
                                        variant="link"
                                        onClick={ () => handleRedirect({
                                          pathname: toPath(routePaths.admin.userEdit, { userId: id! }),
                                          state: initialStatus
                                        }
                                        ) }
                                      >
                                        <FormattedMessage id="label.button.edit" />
                                      </Button>
                                      {
                                        isInLoadingQue(id) ?
                                          <div className="spinner-border mx-auto align-middle" role="status" />
                                          :
                                          currentUserId !== id ? 
                                            <Button
                                              className={ `p-0 ${ styles.actionLink } ${ active ? styles.actionLinkAlert : '' } }` }
                                              variant="link"
                                              onClick={ () => handleStatusChange(id!, active) }
                                            >
                                              <FormattedMessage id={ `label.button.${ !active ? 'activate' : 'deactivate' }` } />
                                            </Button> : null
                                      }
                                    </>
                                  ) : (
                                    <>
                                      {
                                        renderTooltip(
                                          `edit${index}`,
                                          <Button
                                            className={ `p-0 pr-2 ${styles.actionLink} ${styles.actionLinkDisabled}` }
                                            variant="link"
                                            onClick={ emptyFn }
                                          >
                                            <FormattedMessage id="label.button.edit" />
                                          </Button>
                                        )
                                      }
                                      {
                                        renderTooltip(
                                          `active${index}`,
                                          <Button
                                            className={ `p-0 ${styles.actionLink} ${styles.actionLinkDisabled}` }
                                            variant="link"
                                            onClick={ emptyFn }
                                          >
                                            <FormattedMessage id={ `label.button.${ active ? 'activate' : 'deactivate' }` } />
                                          </Button>
                                        )
                                      }
                                    </>
                                  )
                                }
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    }
                  </tbody>
                </Table>
              ) : isLoadingUsers ? (
                <div className={ `${styles.loadingWrapper} text-center mt-5 ` }>
                  <Loader small />
                </div>
              ) :(
                < div className="align-middle text-center mt-5">
                  <h1 className="display-4">
                    <FormattedMessage id="label.notFound" />
                  </h1>
                </div>
              )
          }
        </Col>
      </Row>
    </>
  )
};

export default UsersListing;
