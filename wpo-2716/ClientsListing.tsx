import React, { FC, useEffect, useState } from 'react';
import { useIntl, FormattedMessage } from 'react-intl';
import { useHistory, useLocation } from 'react-router-dom';
import routePaths from '../../routes/routePaths';
import useClients from '../../hooks/useClients';
import { toPath } from '../../helpers/';
import Table from 'react-bootstrap/Table';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import NewClientModal from './NewClientModal';
import ToggleButtonSimple from '../shared/fields/ToggleButtonSimple';
import { STATUS } from '../../constants';
import { IClientList } from '../../services/clientInterface';
import useLanguages from '../../store/useLanguages';
import allClientsService from '../../services/allClients';
import useDocumentTitle from '../../hooks/useDocumentTitle';

import styles from './ClientsListing.module.scss';

const ClientsListing: FC<{}> = () => {
  const intl = useIntl();
  const location = useLocation();
  const initialStatusFilter = location.state === STATUS.INACTIVE ? STATUS.INACTIVE : STATUS.ACTIVE;
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const { clients, isLoading } = useClients(true, statusFilter);
  const [clientsList, setClientsList] = useState<IClientList[] | null>(null);
  const [languages, , , , getLanguageName] = useLanguages();
  const history = useHistory();
  const [isNewClientModalOpen, setNewClientModalOpen] = useState(false);
  useDocumentTitle(intl.formatMessage({ id: 'label.page.clients' }));
  
  useEffect(() => {
    if (languages && clients) {
      setClientsList(allClientsService.transformForListing(clients, getLanguageName));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languages, clients]);

  const handleStatusFilterChange = ( value: string ): void =>{
    switch (value) {
      case STATUS.ACTIVE:
        setStatusFilter(STATUS.ACTIVE);
        break;
      case STATUS.INACTIVE:
        setStatusFilter(STATUS.INACTIVE);
        break;

    }
  }
  const handleEditRedirect = (clientId: string): void => {
    history.push({
      pathname: toPath(routePaths.admin.client, { clientId }),
      state: statusFilter
    });
  }

  return (
    <>
      <Row>
        <Col md={ 6 }>
          <h1>{ intl.formatMessage({ id: 'label.clientsProjects' }) }</h1>
        </Col>
        <Col className="text-right" md={ 6 }>
          <Button
            className={ `ml-n3 ${styles.button}` }
            size="sm"
            variant="secondary"
            onClick={ () => setNewClientModalOpen(true) }
          >
            <FormattedMessage id="label.button.addNewClient" />
          </Button>
        </Col>
      </Row>
      <Row className={ styles.listFilterWrapper } >
        <Col md={ 12 }>
          <label className={ styles.filterLabel }>
            <FormattedMessage id="label.show"  />
          </label>
          <ToggleButtonSimple
            options={ [
              { value: STATUS.ACTIVE, label: intl.formatMessage({ id: 'label.active' }) },
              { value: STATUS.INACTIVE, label: intl.formatMessage({ id: 'label.inactive' }) }
            ] }
            groupValue={ statusFilter }
            handleChange={ handleStatusFilterChange }
          />
        </Col>
      </Row>
      {
        isLoading ? (
          <div className="align-middle text-center">
            <div className="spinner-border mx-auto" role="status" />
          </div>
        ) :
          (
            <>
              <Row>
                <Col md={ 12 }>
                  <Table className={ `mx-auto mt-5 ${styles.table}` }>
                    <thead>
                      <tr className={ styles.tableHeader }>
                        <th className="align-middle text-center w-5">#</th>
                        <th className="align-middle w-10">
                          <FormattedMessage id="label.table.clientName" />
                        </th>
                        <th className="align-middle text-center w-10">
                          <FormattedMessage id="label.table.clientStatus" />
                        </th>
                        <th className="align-middle w-15 pl-4">
                          <FormattedMessage id="label.table.projects" />
                        </th>
                        <th className="align-middle w-25">
                          <FormattedMessage id="label.table.languagePairs" />
                        </th>
                        <th className="align-middle w-10">
                          <FormattedMessage id="label.table.projectStatus" />
                        </th>
                        <th className="align-middle text-center">
                          <FormattedMessage id="label.table.actionPerClient" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        clientsList && clientsList.map(({ id, name, active, projects }, index) => {
                          return (
                            <tr key={ index } className={ styles.tableRow }>
                              <td className={ `align-middle text-center w-5 ${styles.number}` }>{ index + 1 }</td>
                              <td className={ `align-middle w-10 text-break ${styles.name}` }>{ name }</td>
                              <td className={ `text-center align-middle w-10 ${styles.status} ${!active ? styles.statusInactive : ''}` }>
                                <FormattedMessage id={ `label.${ active ? 'active' : 'inactive' }` } />
                              </td>
                              <td colSpan={ 3 } className={ `${styles.customTd} w-50 p-0 align-middle` }>
                                <table className={ `w-100 ${styles.customTable}` }>
                                  <tbody>
                                    {
                                      projects.map(({ projectName, projectLanguages, projectStatus }, i) => {
                                        return (
                                          <tr key={ i } className="align-middle">
                                            { projectName }
                                            { projectLanguages }
                                            { projectStatus }
                                          </tr>
                                        )
                                      })
                                    }
                                  </tbody>
                                </table>
                              </td>
                              <td className="text-center align-middle">
                                <Button
                                  variant="link"
                                  className={ `p-0 ${styles.actionLink}` }
                                  onClick={ () => handleEditRedirect(id) }
                                >
                                  <FormattedMessage id="label.button.edit" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })
                      }
                    </tbody>
                  </Table>
                </Col>
              </Row>
            </>
          )}
      <NewClientModal show={ isNewClientModalOpen } handleClose={ () => setNewClientModalOpen(false) } />
    </>
  );
};

export default ClientsListing;
