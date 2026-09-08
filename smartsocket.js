/**
 * 
 */

//Socket Connection with application and authentication

var socket;
    var serverToken;
    function create_hs(appl_no,authType) {// Create WebSocket connection.
	var smartDiv = document.getElementById('smartLock');
	var faceAuth = document.getElementById('faceAuthReq');
	var proctorReq = document.getElementById('proctorReq');
		
		if(authType==='Anugyna')
		{
		/**
			const extensionId = 'dhdgffkkebhmkfjojejmpbldmpobfkfo';
    
    		const resourceUrl = 'chrome-extension://${extensionId}/options.html#url=&nav=dashboard';

   			fetch(resourceUrl).then(response => {
            	if (response.ok) {
            		alert("Browser extension is installed, please uninstall all the extensions and try again");
                	console.log('Extension likely installed.');
            	} else {
                	console.log('Extension not found or resource not accessible.');
            	}
        	})
        	.catch(error => {
            	console.error('Error detecting extension:', error);
        	});
        */	
      		socket = new WebSocket('ws://localhost:8000/');
      		smartLogout.style.display = "block";
      	}
      	if(authType==="faceAuthReq")
		{
			faceAuthReq.style.display = "block";
			smartLogout.style.display = "none";
		}
		else if(authType!='Anugyna')
		{
			if(authType==="NoExam")
			{
				smartNoExam.style.display = "block";
				NoFaceAuthReq.style.display = "none";
			}
			else if(authType==="completeFlow")
			{
				smartcompleteFlow.style.display = "block";
				NoFaceAuthReq.style.display = "none";
			}
			else if(authType==="scheduleDate")
			{
				scheduleDate.style.display = "block";
				NoFaceAuthReq.style.display = "none";
			}
			else if(authType==="NOfaceAuthReq")
			{
				NoFaceAuthReq.style.display = "block";
			}
			else if(authType==="bioAuth")
			{
				NoFaceAuthReq.style.display = "block";
			}
			else if(authType==="attemptMaxtimes")
			{
				faceauthmaxtimeallowed.style.display = "block";
				NoFaceAuthReq.style.display = "none";
			}
			else if(authType==="attemptMaxtimeDL")
			{
				smartfaceauthmaxtimeallowedDL.style.display = "block";
				NoFaceAuthReq.style.display = "none";
			}
			else if(authType==="attemptMaxtimeslot")
			{
				faceauthmaxtimeallowedslot.style.display = "block";
				NoFaceAuthReq.style.display = "none";
			}
			else if(authType==="alreadyCompleted")
			{
				alreadyCompleted.style.display = "block";
				NoFaceAuthReq.style.display = "none";
			}
			else if(authType==="expiredApplication")
			{
				expiredApplication.style.display = "block";
				NoFaceAuthReq.style.display = "none";
			}
			else if(authType==="photoUpload")
			{
				smartphotoUpload.style.display = "block";
				NoFaceAuthReq.style.display = "none";
			}
			else if(authType==="capturePhoto")
			{
				capturePhoto.style.display = "block";
				NoFaceAuthReq.style.display = "none";
			}
			if(authType==="maxLogins")
			{
				maxLogins.style.display = "block";
				NoFaceAuthReq.style.display = "none";
			}
			if(authType==="quotaFlag")
			{
				quotaFlag.style.display = "block";
				NoFaceAuthReq.style.display = "none";
			}

			photoUpload.style.display = "none";
			completeFlow.style.display = "none";
			NoExam.style.display = "none";
			faceauthmaxtimeallowedDL.style.display = "none";
			faceauthmaxtimeallowedslot.style.display = "none";
			faceAuthReq.style.display = "none";
			proctorReq.style.display = "none";	
			smartLogout.style.display = "block";
		}
		
      // Connection opened
      	socket.addEventListener('open', function (ev) {
		 if(authType==='Anugyna' && appl_no!=null)
		 {
		//	faceAuth.style.display = "none";
       	// console.log(event,"event");
       	// console.log(event.token,"evenetToken");
    		//socket.send('Hello Server!');
        	var reqOb = new Object();
        	reqOb.type = "Authentication";
         	reqOb.token = '1234';
        //reqOb.token = event.token;
        //serverToken = event.token;
        serverToken = "12345";
        // reqOb.userid = '12345';
       	// reqOb.userid = event.eNo;//alert(event.eNo);
        	reqOb.userid = appl_no; //alert(reqOb.userid);
        	var request = JSON.stringify(reqOb);
//        	alert(request);
        	socket.send(request);
 			smartDiv.style.display = "none";
 			sessionStorage.setItem('authType', 'Anugyna');
 		}
		
      });

      // Listen for messages
      var data;
      socket.addEventListener('message', function (event) {
        var res = JSON.parse(event.data);
        if (res['type'] == 'Authentication') {
          if (SHA256(serverToken ) == res['token_hash']) {
            data = { status: "success" }
            console.log(data,"allSet");
           // alert(data);
            //callAngularFunction(data);
          } else {
            data = { status: "failed" }
            
            //callAngularFunction(data);
          }
        }

      });
      socket.addEventListener("close", function (event) {
    	  sessionStorage.clear();
        data = { status: "close" };
		//alert("disconnect message display");
//        smartDiv.style.display = "block";
//		faceAuth.style.display = "none";
        //callAngularFunction(data);
        console.log("disconnected!");
        if(authType==='Anugyna' && appl_no==='12345')
        {
        	var pname = window.location.pathname.split('/');
			var newurl = window.location.origin+"/"+pname[1]+"/403.jsp";
			window.location.href = newurl;
        }
        else
        { 
        	smartDiv.style.display = "block";
			faceAuth.style.display = "none";
			proctorReq.style.display = "none";
			smartLogout.style.display = "block";
			NoFaceAuthReq.style.display = "none";
			maxLogins.style.display = "none";
			capturePhoto.style.display = "none";
			photoUpload.style.display = "none";
			alreadyCompleted.style.display = "none";
			expiredApplication.style.display = "none";
			faceauthmaxtimeallowedslot.style.display = "none";
			faceauthmaxtimeallowedDL.style.display = "none";
			faceauthmaxtimeallowed.style.display = "none";
			scheduleDate.style.display = "none";
			completeFlow.style.display = "none";
			NoExam.style.display = "none";
			smartphotoUpload.style.display = "none";
			smartcompleteFlow.style.display = "none";
			smartNoExam.style.display = "none";
			smartfaceauthmaxtimeallowedDL.style.display = "none";
			smartfaceauthmaxtimeallowedslot.style.display = "none";
			faceAuthReq.style.display = "none";
		}
      });

      socket.addEventListener("error", function (event) {
    	  sessionStorage.clear();
    	if(authType==='Anugyna' && appl_no!='12345')
      	{
      		data = { status: "error" };
        	var pname = window.location.pathname.split('/');
			var newurl = window.location.origin+"/"+pname[1]+"/403.jsp";
			window.location.href = newurl;
        }
        else
        { 
        	smartDiv.style.display = "block";
			faceAuth.style.display = "none";
			proctorReq.style.display = "none";
			smartLogout.style.display = "block";
			NoFaceAuthReq.style.display = "none";
			maxLogins.style.display = "none";
			capturePhoto.style.display = "none";
			photoUpload.style.display = "none";
			alreadyCompleted.style.display = "none";
			expiredApplication.style.display = "none";
			faceauthmaxtimeallowedslot.style.display = "none";
			faceauthmaxtimeallowedDL.style.display = "none";
			faceauthmaxtimeallowed.style.display = "none";
			scheduleDate.style.display = "none";
			completeFlow.style.display = "none";
			NoExam.style.display = "none";
			smartphotoUpload.style.display = "none";
			smartcompleteFlow.style.display = "none";
			smartNoExam.style.display = "none";
			smartfaceauthmaxtimeallowedDL.style.display = "none";
			smartfaceauthmaxtimeallowedslot.style.display = "none";
			faceAuthReq.style.display = "none";
		}
        ///callAngularFunction(data);
        console.log("some error occurred!");
      });
    }
	
	function applStatus(url) {
		var appl_no = document.forms["authentication"]["llappln"].value;
		//alert(appl_no);
		var newobj = new Object();
        newobj.type = 'GenerateLicence';
        newobj.userid = appl_no; //alert(newobj.userid);alert(location.pathname);//alert(location.pathname.slice(0, location.pathname.lastIndexOf('/')+1));
		newobj.url = location.origin+location.pathname.slice(0, window.location.pathname.lastIndexOf('/')+1)+url;//alert(newobj.url);
        var newrequest = JSON.stringify(newobj);

//alert(newrequest);			
//socket.send(newrequest);
      setTimeout(() => {
        socket.send(newrequest);
      }, 0)
    }


function applStatus(url,slot,appl_no) {
		//var appl_no = document.forms["authentication"]["llappln"].value;
		//alert(appl_no);
		var newobj = new Object();
        newobj.type = 'GenerateLicence';
        newobj.userid = appl_no; //alert(newobj.userid);
		if(slot=="slots")
		{
			newobj.url = location.origin+"//"+url;//alert(newobj.url);
		} else {
			newobj.url = location.origin+location.pathname.slice(0, window.location.pathname.lastIndexOf('/')+1)+url;//alert(newobj.url);
		}
        var newrequest = JSON.stringify(newobj);

//alert(newrequest);			
//socket.send(newrequest);
      setTimeout(() => {
        socket.send(newrequest);
      }, 1000)
    }

    function logout() {
      setTimeout(() => {
        socket.send('{"type":"LOGOUT"}');
      }, 1000)
    }
    /*function callAngularFunction(data) {
      window.angularComponentReference.zone.run(() => { window.angularComponentReference.loadAngularFunction(data); });
    }*/
	