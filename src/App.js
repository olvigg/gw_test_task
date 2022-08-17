import {useState, useLayoutEffect} from 'react';
import Cookies from "js-cookie";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import moment from 'moment';
import './App.scss';

import map from 'lodash/map';
import orderBy from 'lodash/orderBy';
import minBy from 'lodash/minBy';
import maxBy from 'lodash/maxBy';
import sumBy from 'lodash/sumBy';

const isDev = process.env.NODE_ENV === 'development';
const cookieDomain = isDev ? 'localhost' : 'some.prod.domain';
const defaultSortCookie = Cookies.get('default-sorting');

const sortableFields = [
    {field: 'name', title: 'Name'},
    {field: 'size', title: 'Size'},
    {field: 'mtime', title: 'Date'},
];

function App() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sorting, setSorting] = useState(null);
    const [shouldShowDetails, setShouldShowDetails] = useState(false);

    const changeSort = (field) => {
        const newSorting = {
            field,
            dir: field === sorting.field && sorting.dir === 'asc'
                ? 'desc'
                : 'asc'
        };
        Cookies.set(
            'default-sorting',
            JSON.stringify(newSorting),
            { path: '/', domain: cookieDomain }
        );

        const sortedData = sortData(newSorting, sorting.data);

        setSorting({
            ...newSorting,
            data: sortedData
        });
    };

    const getSortIcon = (field) => {
        if (sorting.field === field) {
            return sorting.dir === 'asc' //may be here will be better 'desc', for UX
                ? (<FontAwesomeIcon icon="sort-asc" className="icon" />)
                : (<FontAwesomeIcon icon="sort-desc" className="icon" />)
        }
        return null;
    };

    useLayoutEffect(() => {
        fetch('https://prof.world/api/test_json_files/?token=6a06cc0050374e32be51125978904bd8')
        .then(async (res) => {
            //if (res.ok) {
                const responseData = await res.json();
                const preparedData = preprocessData(
                    responseData.data && responseData.data.ok && responseData.data.files
                        ? responseData
                        : responseSample
                );
                const defaultSorting = (defaultSortCookie && isJson(defaultSortCookie))
                    ? JSON.parse(defaultSortCookie)
                    : {field: 'name', dir: 'desc'};
                setSorting({
                    ...defaultSorting,
                    data: sortData(defaultSorting, preparedData)
                });
                return;
            //}
            //throw new Error('Something went wrong');
        }).catch(err => {
            setError(err);
        }).finally(() => {
            setLoading(false);
        });

    }, []);

    return (
        <div className="app">
            <div className="header">
                <p>GW test task</p>
            </div>

            <div className="content">
                {!loading && sorting && (<>
                    <div className="sort_wrap">
                        <span onClick={() => setShouldShowDetails(!shouldShowDetails)}>
                            Sort by:
                        </span>
                        {map(sortableFields, (it, i) => {
                            return (
                                <span key={`sf${i}`}
                                    className={`${it.field === sorting.field ? 'active' : ''}`}
                                    onClick={() => changeSort(it.field)}
                                >
                                    <span>{it.title}</span>
                                    {getSortIcon(it.field)}
                                </span>)
                        })}
                    </div>
                    <div className="tree">
                        {map(sorting.data, (folder, i) => {
                            return (<div className="line folder" key={`lfolder${i}`}>
                                <FontAwesomeIcon
                                    icon="folder-open"
                                    className="icon__folder"
                                /> {folder.folderName}

                                {map(folder.files, (file, j) => {
                                    return (<div className="line file" key={`lfile${j}`}>
                                        {file.icon}
                                        <span className="filename">{file.name}</span>
                                        {shouldShowDetails && (<>
                                            <span className="size">{formatSize(file.size)}</span>
                                            <span className="ts">{moment.unix(file.mtime).format('DD MMM HH:mm:ss')}</span>
                                        </>)}
                                    </div>)
                                })}
                            </div>);
                        })}
                    </div>
                </>)}

                {loading && (<div className="msg loading">Wait, please. Data is loading...</div>)}

                {error && (<div className="msg error">{error}</div>)}

            </div>
        </div>
    );
};

const preprocessData = (responseData) => {
    return responseData && responseData.data
        ? map(Object.keys(responseData.data.files), (folderName, i) => {
            const files = responseData.data.files[folderName];
            return {
                folderName,
                files: map(files, it => ({...it, icon: getIconForType(it.type)})),
                size: sumBy(files, 'size'),
                mtimes: {
                    min: minBy(files, 'mtime').mtime,
                    max: maxBy(files, 'mtime').mtime
                }
            }
        })
        : [];
};

const sortData = (sorting, data) => {
    const sortedFolders = data ? orderBy(data, [
        it => {
            switch (sorting.field) {
                case 'name': return it.folderName.toLowerCase();
                case 'size': return it.size;
                case 'mtime': return it.mtimes[sorting.dir === 'asc' ? 'max' : 'min'];
                default: return;
            }
        }], [sorting.dir]) : [];

    const sortedData = data
        ? map(sortedFolders, folder => {
            return {
                ...folder,
                files: orderBy(folder.files, [
                    it => sorting.field === 'name'
                        ? it[sorting.field].toLowerCase()
                        : it[sorting.field]
                ], [sorting.dir])
            };
        })
        : [];

    return sortedData;
};

const typeToIconsMapping = {
    image: 'file-image',
    sheet: 'file-excel',
    msword: 'file-word',
    pdf: 'file-pdf',
};

const getIconForType = (type) => {
    let typeForMap = '';
    let subtype = '';

    const chunks = type.split('/');
    if (chunks.length > 1) {
        const subchunks = chunks[1].split('.');
        subtype = subchunks[subchunks.length - 1];
        switch (chunks[0]) {
            case 'application':
                typeForMap = subchunks[subchunks.length - 1];
                break;
            case 'image':
                typeForMap = 'image';
                break;
            default: break;
        };
    } else {
        typeForMap = chunks[0] || '';
    }

    const shouldAddTypeHint = typeForMap === 'image';
    /* || ...  or check if exist in addTypeHintList */

    return (<>
        <FontAwesomeIcon
            icon={typeToIconsMapping[typeForMap] || 'file'}
            className="icon__file"
        />
        {shouldAddTypeHint && (<span className="type_hint">{subtype}</span>)}
    </>)
};

const formatSize = (fileSize) => {
    const size = Number(fileSize) || 0;
    if (size < 1024) return size + ' B';
    const kB = size / 1024;
    if (kB < 1024) return kB.toFixed(1) + ' kB';
    const MB = kB / 1024;
    if (MB < 1024) return MB.toFixed(1) + ' MB';
    const GB = MB / 1024;
    if (GB < 1024) return GB.toFixed(1) + ' GB';
    /*...*/
}

const isJson = (str) => {
    try { JSON.parse(str); } catch (e) { return false; }
    return true;
};

//just for case of revoking the token by GW
const responseSample = {
    "ok": 1,
    "data": {
        "files": {
            "Folder1": [{
                "name": "avatar.png",
                "type": "image/png",
                "size": 13149,
                "atime": 1660650089,
                "mtime": 1641977227,
                "dev": 2049
            }, {
                "name": "processed1.jpeg",
                "type": "image/jpeg",
                "size": 514889,
                "atime": 1660650089,
                "mtime": 1641977229,
                "dev": 2049
            }],
            "Folder2": [{
                "name": "regions.xlsx",
                "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "size": 10234,
                "atime": 1660650089,
                "mtime": 1641977227,
                "dev": 2049
            }, {
                "name": "\u0413\u0438\u0442\u0430\u0440\u043d\u044b\u0439 \u0431\u0443\u0444\u0435\u0440.pdf",
                "type": "application/pdf",
                "size": 448230,
                "atime": 1660650089,
                "mtime": 1641977229,
                "dev": 2049
            }, {
                "name": "\u0422\u0417.docx",
                "type": "inode/x-empty",
                "size": 0,
                "atime": 1641977227,
                "mtime": 1641977231,
                "dev": 2049
            }],
            "Folder3": [{
                "name": "SIP-line Trunk VoIP FAQ v1 0.doc",
                "type": "application/msword",
                "size": 488448,
                "atime": 1660650089,
                "mtime": 1641977227,
                "dev": 2049
            }, {
                "name": "catalog_2018.pdf",
                "type": "application/pdf",
                "size": 11997202,
                "atime": 1660650089,
                "mtime": 1641977229,
                "dev": 2049
            }]
        }
    }
};

export default App;
