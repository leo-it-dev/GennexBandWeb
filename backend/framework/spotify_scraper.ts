import * as xml2js from 'xml2js';

export function initialize() {}

function findJSONobjects(obj: any, stack: string): object[] {
    let objsFound: object[] = [];
    for (let property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (typeof obj[property] == "object") {
                objsFound.push(...findJSONobjects(obj[property], stack + '.' + property));
            } else {
                if (stack.includes(".script") || property == "script") {
                    try {
                        let json = JSON.parse(obj[property]);
                        objsFound.push(json);
                    } catch(err) {}
                }
            }
        }
    }
    return objsFound;
}

function flattenAttributes(obj: any, stack: string): object {
    let objOut: any = {};

    for (let property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (typeof obj[property] == "object") {
                let objSub = flattenAttributes(obj[property], (stack.length > 0 ? stack + "." : "") + property);
                for(let attr of Object.keys(objSub)) {
                    objOut[attr] = (objSub as any)[attr];
                }
            } else {
                objOut[(stack.length > 0 ? stack + "." : "") + property] = obj[property];
            }
        }
    }
    return objOut;
}


function findLists(obj: any, stack: string): any[][] {
    let objsFound: any[] = [];
    for (let property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (Array.isArray(obj[property])) {
                objsFound.push(obj[property]);
            } else if (typeof obj[property] == "object") {
                objsFound.push(...findLists(obj[property], stack + '.' + property));
            }
        }
    }
    return objsFound;
}


function findBiggestJsonObject(objs: object[]) {
    objs = objs.sort((oA, oB) => JSON.stringify(oB).length - JSON.stringify(oA).length);
    return objs[0];
}

function findLargestList(lists: any[][]) {
    lists = lists.sort((lA, lB) => lB.length - lA.length);
    return lists[0];
}

function normalizeObjects(attributeList: string[], objects: object[]): any[] {
    let objsOut: object[] = [];
    for(let obj of objects) {
        let objNew = {};
        for(let attr of attributeList) {

            let nearestObjRef = obj;
            let nearestObjChg = objNew;
            for(let attrSub of attr.split(".")) {
                if(!nearestObjRef.hasOwnProperty(attrSub)) {
                    (nearestObjRef as any)[attrSub] = {};
                    (nearestObjChg as any)[attrSub] = {};
                } else {
                    (nearestObjChg as any)[attrSub] = (nearestObjRef as any)[attrSub];
                }
                nearestObjRef = (nearestObjRef as any)[attrSub];
                nearestObjChg = (nearestObjChg as any)[attrSub];
            }
        }
        objsOut.push(objNew);
    }
    return objsOut;
}

function extractAttributes(attributeList: string[], object: object): string[] {
    let datOut: string[] = [];
    for(let attr of attributeList) {
        let nearestObjRef = object;
        for(let attrSub of attr.split(".")) {
            if(!nearestObjRef.hasOwnProperty(attrSub)) {
                return [];
            } else {
                datOut.push((nearestObjRef as any)[attrSub] as string);
            }
            nearestObjRef = (nearestObjRef as any)[attrSub];
        }
    }
    return datOut;
}

export function scrapeSongsFromPublicPlaylist(playlistId: string): Promise<string[]> {
    return new Promise<string[]>((res, rej) => {
        let url = "https://open.spotify.com/embed/playlist/" + playlistId;
        fetch(url, {
            method: 'GET'
        }).then(dat => dat.text()).then(html => {
            xml2js.parseString(html, (err, dat) => {
                let objs = findJSONobjects(dat, "");
                let infoJSON = findBiggestJsonObject(objs);
                let lists = findLists(infoJSON, "");
                let largestList = findLargestList(lists);

                let trackAttributes = [...new Set(largestList.map(entry => Object.keys(flattenAttributes(entry, ''))).reduce((prev, curr, idx) => [...prev, ...curr]))]
                let normalizedObjects = normalizeObjects([...trackAttributes], largestList);

                if (normalizeObjects.length == 0) {
                    res([]);
                    return;
                }

                // Filter out all attributes that don't have a string type. Our title is expected to be a string 
                trackAttributes = trackAttributes.filter(attr => 
                    typeof(normalizedObjects[0][attr]) == 'string'
                );

                // Filter out all attributes that have equal value length in each object
                trackAttributes = trackAttributes.filter(attr => 
                    normalizedObjects.map(obj => 
                        (obj[attr] as string).length - (normalizedObjects[0][attr] as string).length
                    ).find(lengthDeviationFromLength0 => lengthDeviationFromLength0 != 0) != undefined
                );

                // Extract attributes from all objects and smoosh together
                let songDataOut = normalizedObjects.map(obj => extractAttributes(trackAttributes, obj))
                    .map(attributes => attributes.join(' - '))

                res(songDataOut);
            });
        }).catch(err => {
            rej(err);
        });
    });
}