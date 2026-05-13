const calculateEscalationLevel=(dueDate)=>{
    const currentDate=new Date();
    const due=new Date(dueDate);
    const diff=currentDate-due;
    const oneDay=24*60*60*1000;
    const daysOverdue=Math.floor(diff/oneDay);
    return daysOverdue;
};

const getFollowUpStage=(daysOverdue)=>{
    if(daysOverdue>=1 && daysOverdue<=7){
        return{
            stage:"Stage 1",
            tone:"Warm & friendly"
        };
    }
    else if(daysOverdue>=8 && daysOverdue<=14){
        return {
            stage:"Stage 2",
            tone:"Polite & firm"
        };
    }
    else if(daysOverdue>=15 && daysOverdue<=21){
        return{
            stage:"Stage 3",
            tone:"Formal & serious"
        };
    }
    else if (daysOverdue >= 22 && daysOverdue <= 30) {
        return {
            stage: "Stage 4",
            tone: "Stern & Urgent"
        };
    }
    else if(daysOverdue>30){
        return {
            stage: "ESCALATED",
            tone: "Legal review"
        };
    }
    else{
        return{
            stage:0,
            tone:"No follow-up needed"
        };
    }
};

module.exports={calculateEscalationLevel,getFollowUpStage};