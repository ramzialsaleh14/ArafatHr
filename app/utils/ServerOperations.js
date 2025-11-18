import { Platform } from "react-native";
import * as Constants from "./Constants";
import * as Commons from "./Commons";

const httpTimeout = (ms, promise) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("timeout"));
    }, ms);
    promise.then(resolve, reject);
  });

export const httpRequest = async (url) => {
  /* Send request */
  const TIMEOUT = 20000;

  const response = await httpTimeout(
    TIMEOUT,
    fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }).catch((error) => {
      console.error(error);
      return Constants.networkError_code;
    })
  ).catch((error) => {
    return Constants.networkError_code;
  });
  const json = await response.json();
  return json;
};

export const ping = async (url, timeout) => {
  const response = await httpTimeout(
    timeout,
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "action=",
    })
      .then((response) => {
        if (response.status !== 200) {
          throw new Error("HTTP response status not code 200 as expected.");
        }
      })
      .catch((error) => {
        console.error(error);
        return Constants.networkError_code;
      })
  ).catch((error) => {
    console.log(error);
    return Constants.networkError_code;
  });
  return response;
};

export const pickHttpRequest = async (params) => {
  /* Send request */
  params = params
    .replace(/١/g, 1)
    .replace(/٢/g, 2)
    .replace(/٣/g, 3)
    .replace(/٤/g, 4)
    .replace(/٥/g, 5)
    .replace(/٦/g, 6)
    .replace(/٧/g, 7)
    .replace(/٨/g, 8)
    .replace(/٩/g, 9)
    .replace(/٠/g, 0);
  const TIMEOUT = 20000;
  const user = await Commons.getFromAS("userID");
  const url = Constants.pickServerUrl + params + "&currentuser=" + user;

  console.log(url);

  const response = await httpTimeout(
    TIMEOUT,
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    }).catch((error) => {
      console.error(error);
      return Constants.networkError_code;
    })
  ).catch((error) => {
    return Constants.networkError_code;
  });

  return response;
};



export const checkLogin = async (userID, password, appVersion) => {
  try {
    /* Request params */
    let params = "";
    params += `action=${Constants.CHECK_LOGIN}`;
    params += `&USER=${userID}`;
    params += `&PASSWORD=${password}`;
    params += `&APP.VERSION=${Constants.appVersion}`;

    console.log('Login request params:', params);

    /* Send request */
    const response = await pickHttpRequest(params);


    /* Check response */
    if (response === Constants.networkError_code) {
      console.error('Network error during login');
      return null;
    }

    if (response && response.ok) {
      try {
        const jsonResult = await response.json();
        console.log('Login JSON result:', jsonResult);
        return jsonResult;
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        return null;
      }
    }

    console.error('Login failed - response not ok:', response);
    return null;
  } catch (error) {
    console.error('Login request failed:', error);
    return null;
  }
};

export const getNamesList = async () => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_NAMES_LIST}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getLeavesInfo = async (user) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_LEAVES_INFO}`;
  params += `&USER=${user}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const pickUploadHttpRequest = async (file) => {
  /* Send request */
  const TIMEOUT = 45000;
  const url = `${Constants.serverBaseUrl}/pick/faces/redirect/HRSERVICE?action=upload&fileupload=y&fname=${encodeURIComponent(file.name)}`;
  const currServer = await Constants.serverPublicBaseUrl;
  console.log('Uploading file to URL:', url);
  console.log('File details:', file);

  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type || 'application/octet-stream',
  });

  try {
    const response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT)),
    ]);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const responseData = await response.json();
      console.log('Upload successful:', responseData);
      return responseData;
    } else {
      // If not JSON, treat as success and return filename
      const responseText = await response.text();
      console.log('Upload successful (non-JSON response):', responseText);
      return { URL: file.name, success: true };
    }
  } catch (error) {
    console.error('Upload error:', error);
    return Constants.networkError_code;
  }
};

export const getLocations = async (user) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_LOCATIONS}`;
  params += `&USER=${user}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const CheckIsChecked = async (user, date, type) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.CHECK_IS_CHECKED}`;
  params += `&USER=${user}`;
  params += `&DATE=${date}`;
  params += `&TYPE=${type}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const checkInOrOut = async (user, date, time, location, type, userdevId) => {
  try {
    /* Request params */
    let params = "";
    params += `action=${Constants.CHECK_IN_OUT}`;
    params += `&USER=${user}`;
    params += `&DATE=${date}`;
    params += `&TIME=${time}`;
    params += `&LOCATION=${encodeURIComponent(location)}`;
    params += `&TYPE=${type}`;
    params += `&USERDEVID=${userdevId}`;

    console.log('Check in/out request params:', params);

    /* Send request */
    const response = await pickHttpRequest(params);


    /* Check response */
    if (response === Constants.networkError_code) {
      console.error('Network error during check in/out');
      return { result: false, error: 'Network error' };
    }

    if (response && response.ok) {
      try {
        const jsonResult = await response.json();
        console.log('Check in/out JSON result:', jsonResult);
        return jsonResult;
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        return { result: false, error: 'Invalid response format' };
      }
    }

    console.error('Check in/out failed - response not ok:', response);
    return { result: false, error: 'Server error' };
  } catch (error) {
    console.error('Check in/out request failed:', error);
    return { result: false, error: error.message };
  }
};


export const sendUserToken = async (user, token, devId) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.SEND_USER_TOKEN}`;
  params += `&USER=${user}`;
  params += `&TOKEN=${token}`;
  params += `&DEVID=${devId}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};



export const getServerToken = async (user) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_SERVER_TOKEN}`;
  params += `&USER=${user}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getLeaveTypes = async () => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_LEAVE_TYPES}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const getServerCurTime = async () => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_SERVER_CUR_TIME}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const clearUserDeviceID = async (userNo) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.CLEAR_USER_DEVICE_ID}`;
  params += `&USER=${userNo}`;
  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

export const submitLeaveRequest = async (
  leaveTypeId,
  fromDate,
  toDate,
  fromTime,
  toTime,
  note,
  attachments,
  user
) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.SUBMIT_LEAVE_REQ}`;
  params += `&LEAVE.TYPE=${leaveTypeId}`;

  // Send all date/time parameters regardless of holidayOrLeave
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;
  params += `&FROM.TIME=${fromTime}`;
  params += `&TO.TIME=${toTime}`;
  params += `&NOTE=${encodeURIComponent(note)}`;
  params += `&ATTACHMENTS=${encodeURIComponent(attachments)}`;
  params += `&USER=${user}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};


/* Get pending leave requests for a user */
export const getPendingRequests = async (user) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_PENDING_REQUESTS}`;
  params += `&USER=${user}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

/* Get user group details */
export const getUserGroupDetails = async (user) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_USER_GROUP_DETAILS}`;
  params += `&USER=${user}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

/* Send app notes for a user */
export const sendAppNotes = async (user, date, note) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.SEND_APP_NOTES}`;
  params += `&USER=${encodeURIComponent(user)}`;
  params += `&DATE=${encodeURIComponent(date)}`;
  params += `&NOTE=${encodeURIComponent(note)}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

/* Respond to a leave request (accept/reject) */
export const respondToRequest = async (requestId, response, notes, user) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.RESPOND_TO_REQUEST}`;
  params += `&REQUEST.ID=${requestId}`;
  params += `&RESPONSE=${response}`;
  params += `&NOTES=${encodeURIComponent(notes || '')}`;
  params += `&USER=${user}`;

  /* Send request */
  const serverResponse = await pickHttpRequest(params);

  /* Check response */
  if (serverResponse === Constants.networkError_code) {
    return { success: false, error: 'Network error' };
  }

  if (serverResponse.ok) {
    const result = await serverResponse.json();
    return { success: true, data: result };
  }

  return { success: false, error: 'Server error' };
};

/* Get names list for employee selection */
export const getNameslist = async () => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_NAMES_LIST}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};

/* Get all HR requests with filters */
export const getAllRequestsHr = async (fromDate, toDate, empId, status) => {
  /* Request params */
  let params = "";
  params += `action=${Constants.GET_ALL_REQUESTS_HR}`;
  params += `&FROM.DATE=${fromDate}`;
  params += `&TO.DATE=${toDate}`;
  params += `&EMP.ID=${empId}`;
  params += `&STATUS=${status}`;

  /* Send request */
  const response = await pickHttpRequest(params);

  /* Check response */
  if (response === Constants.networkError_code) {
    return null;
  }
  if (response.ok) {
    return await response.json();
  }

  return null;
};
