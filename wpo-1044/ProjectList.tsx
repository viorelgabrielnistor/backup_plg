import React, { FC } from 'react';
import { Field, getIn } from 'formik';
import { useIntl } from 'react-intl';

import { ICustomSelectOption } from '../shared/fields/CustomSelectInterface';
import { IProjectDisplay } from './UserDetails';
import Table from 'react-bootstrap/Table';
import { getCustomSelectValue } from '../../helpers/formatForFields';

import styles from './UserDetails.module.scss';

interface ISupervisedProject {
  supervisedProject?: boolean;
}
export interface IExtendedProjectDisplay extends IProjectDisplay, ISupervisedProject { }

interface IProjectListProps {
  projects: IExtendedProjectDisplay[];
  selectedProjects: ICustomSelectOption[];
  isRequired?: boolean;
  isInvalid: boolean;
  hasAssign: boolean;
}

const ProjectList: FC<IProjectListProps> = ({ projects, selectedProjects, isRequired, isInvalid, hasAssign }) => {
  const intl = useIntl();

  return (
    <>
      {
        projects && projects.length >= 1 &&
        <>
          <label className={ `${ styles.label } ${ isRequired ? styles.required :'' }` }>{ intl.formatMessage({ id: 'label.table.projects' }) }</label>
          {
            hasAssign &&
            <p className="mb-4">{ intl.formatMessage({ id: 'label.project.assign' }) }</p>
          }
          <div className="mb-4">
            <Field name="assignedProject">
              {({ field, form: { setFieldTouched, setFieldValue, errors } }) => (
                <>
                  <Table className={ styles.table }>
                    <thead>
                      <tr>
                        <th className="w-25">{ intl.formatMessage({ id: 'label.projectName' }) }</th>
                        <th>{ intl.formatMessage({ id: 'label.languagePairs' }) }</th>
                        <th>{ intl.formatMessage({ id: 'label.status' }) }</th>
                        { hasAssign && <th className="text-center">{ intl.formatMessage({ id: 'label.assign' }) }</th> }
                      </tr>
                    </thead>
                    <tbody>
                      {
                        projects.map(({ id, name, languagePairs, active, supervisedProject }: IExtendedProjectDisplay, index) => {
                          return supervisedProject  && (
                            <tr key={ id ? id + index : index }>
                              <td className="text-break">{ name }</td>
                              <td>{ languagePairs }</td>
                              <td>{ active ? intl.formatMessage({ id: 'label.active' }) : intl.formatMessage({ id: 'label.inactive' }) }</td>
                              {
                                hasAssign && supervisedProject &&
                              <td className="text-center">
                                <label className={ styles.customCheckbox }>
                                  <input
                                    { ...field }
                                    type="checkbox"
                                    checked={ !!selectedProjects.find((sProject) => sProject.value === id) }
                                    data-qa={ field.name + index }
                                    onChange={ () => {
                                      setFieldTouched('assignedProjects', true);

                                      let newSelectedValue;
                                      if (selectedProjects.find((sProject) => sProject.value === id)) {
                                        newSelectedValue = selectedProjects.filter((sProject) => sProject.value !== id);
                                      } else {
                                        newSelectedValue = [ ...selectedProjects, getCustomSelectValue(name, id, { active })];
                                      }
                                      setFieldValue('assignedProjects', newSelectedValue);
                                    } }
                                  />
                                </label>
                              </td>
                              }
                            </tr>
                          )
                        })
                      }
                    </tbody>
                  </Table>

                  { isInvalid &&
                  <div className="text-danger">
                    { getIn(errors, 'assignedProjects') }
                  </div>
                  }
                </>
              )}
            </Field>
          </div>
        </>
      }
    </>
  );
};

export default ProjectList;
