import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';

interface CustomDateTimePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    initialDate?: Date;
    minDate?: Date;
    maxDate?: Date;
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CustomDateTimePicker({ 
    visible, 
    onClose, 
    onSelect, 
    initialDate = new Date(),
    minDate,
    maxDate
}: CustomDateTimePickerProps) {
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
    const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
    const [selectedTime, setSelectedTime] = useState(
        initialDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    );

    // Initialize state when initialDate changes
    useEffect(() => {
        if (visible) {
            setSelectedDate(initialDate);
            setCurrentMonth(initialDate.getMonth());
            setCurrentYear(initialDate.getFullYear());
            setSelectedTime(initialDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
        }
    }, [visible, initialDate]);

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        return new Date(year, month, 1).getDay();
    };

    const generateCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
        const days = [];

        // Padding for empty slots at start
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        // Actional days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    const isDateDisabled = (day: number) => {
        if (!day) return true;
        // Validate inputs
        if (isNaN(currentYear) || isNaN(currentMonth)) return true;
        
        const dateToCheck = new Date(currentYear, currentMonth, day);
        if (isNaN(dateToCheck.getTime())) return true;

        dateToCheck.setHours(23, 59, 59, 999); 

        if (minDate && !isNaN(minDate.getTime())) {
            const min = new Date(minDate);
            min.setHours(0, 0, 0, 0);
            if (dateToCheck < min) return true;
        }

        if (maxDate && !isNaN(maxDate.getTime())) {
            const max = new Date(maxDate);
            max.setHours(23, 59, 59, 999);
            const checkStart = new Date(currentYear, currentMonth, day);
            checkStart.setHours(0, 0, 0, 0);
             
            if (checkStart > max) return true;
        }

        return false;
    };

    const handlePrevMonth = () => {
        const prevDate = new Date(currentYear, currentMonth - 1, 1);
        // Allow going back if the end of previous month is not before minDate
        const prevMonthEnd = new Date(currentYear, currentMonth, 0);
        
        if (minDate && prevMonthEnd < minDate) return; 

        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);
        if (maxDate && nextMonthStart > maxDate) return;

        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleDateSelect = (day: number) => {
        if (isDateDisabled(day)) return;
        const newDate = new Date(selectedDate);
        newDate.setFullYear(currentYear);
        newDate.setMonth(currentMonth);
        newDate.setDate(day);
        setSelectedDate(newDate);
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
    };

    const handleConfirm = () => {
        const finalDate = new Date(selectedDate);

        if (selectedTime) {
             const [timePart, modifier] = selectedTime.split(' ');
             if (timePart) {
                let [hours, minutes] = timePart.split(':').map(Number);
                if (!isNaN(hours) && !isNaN(minutes)) {
                    if (modifier === 'PM' && hours < 12) hours += 12;
                    if (modifier === 'AM' && hours === 12) hours = 0;
                     finalDate.setHours(hours, minutes, 0, 0);
                }
             }
        }
        
        onSelect(finalDate);
        onClose();
    };

    const generateTimeSlots = () => {
        const times = [];
        for (let i = 8; i <= 20; i++) { // 8 AM to 8 PM
            const hour = i > 12 ? i - 12 : i;
            const ampm = i >= 12 ? 'PM' : 'AM';
            times.push(`${hour}:00 ${ampm}`);
            times.push(`${hour}:30 ${ampm}`);
        }
        return times;
    };

    const isDateSelected = (day: number) => {
        return selectedDate.getDate() === day && 
               selectedDate.getMonth() === currentMonth && 
               selectedDate.getFullYear() === currentYear;
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    
                    {/* Header: Month Navigation */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
                            <Ionicons name="chevron-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.monthTitle}>
                            {MONTHS[currentMonth]} {currentYear}
                        </Text>
                        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
                            <Ionicons name="chevron-forward" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.bodyContainer}>
                        {/* Left Side: Calendar */}
                        <View style={styles.calendarContainer}>
                            <View style={styles.weekDays}>
                                {DAYS_OF_WEEK.map(day => (
                                    <Text key={day} style={styles.weekDayText}>{day}</Text>
                                ))}
                            </View>
                            <View style={styles.daysGrid}>
                                {generateCalendarDays().map((day, index) => {
                                    const disabled = day === null || (day && isDateDisabled(day));
                                    return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.dayCell,
                                            day === null && styles.emptyCell,
                                            day && isDateSelected(day) && styles.selectedDayCell
                                        ]}
                                        onPress={() => day && handleDateSelect(day)}
                                        disabled={!!disabled}
                                    >
                                        <Text style={[
                                            styles.dayText,
                                            day && isDateSelected(day) && styles.selectedDayText,
                                            disabled && styles.disabledDayText
                                        ]}>
                                            {day}
                                        </Text>
                                    </TouchableOpacity>
                                )})}
                            </View>
                        </View>

                        {/* Right Side: Times (Scrollable Vertical List) */}
                        <View style={styles.timeContainer}>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {generateTimeSlots().map((time, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.timeSlot,
                                            selectedTime === time && styles.selectedTimeSlot
                                        ]}
                                        onPress={() => handleTimeSelect(time)}
                                    >
                                        <Text style={[
                                            styles.timeText,
                                            selectedTime === time && styles.selectedTimeText
                                        ]}>
                                            {time}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {/* Footer: Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                            <Text style={styles.confirmButtonText}>Schedule</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.selectedDisplay}>
                         <Text style={styles.selectedDisplayText}>
                             {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric'})}
                         </Text>
                    </View>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        width: '90%',
        maxHeight: '80%',
        padding: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    navButton: {
        padding: 5,
    },
    bodyContainer: {
        flexDirection: 'row', // Side by side for Calendar and Time
        height: 300,
    },
    calendarContainer: {
        flex: 2, // Take up 2/3 of space
        marginRight: 10,
    },
    timeContainer: {
        flex: 1, // Take up 1/3 of space
        borderLeftWidth: 1,
        borderLeftColor: '#f0f0f0',
        paddingLeft: 10,
    },
    weekDays: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    weekDayText: {
        color: '#888',
        fontSize: 12,
        width: 30,
        textAlign: 'center',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    dayCell: {
        width: '14.28%', // 7 days in a week
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    emptyCell: {
        backgroundColor: 'transparent',
    },
    selectedDayCell: {
        backgroundColor: '#6B4EFF', // Purple accent
        borderRadius: 8,
    },
    dayText: {
        fontSize: 14,
        color: '#333',
    },
    selectedDayText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    disabledDayText: {
        color: '#ccc',
    },
    timeSlot: {
        paddingVertical: 10,
        paddingHorizontal: 5,
        borderRadius: 8,
        marginBottom: 5,
        alignItems: 'center',
    },
    selectedTimeSlot: {
        backgroundColor: '#f0f0f0',
    },
    timeText: {
        fontSize: 14,
        color: '#333',
    },
    selectedTimeText: {
        fontWeight: 'bold',
        color: '#6B4EFF',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: '#6B4EFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    selectedDisplay: {
        position: 'absolute',
        bottom: 25,
        left: '50%',
        transform: [{translateX: -50}],
        display: 'none' // Hidden for now, cleaner
    },
    selectedDisplayText: {
        fontSize: 12, 
        color: '#888'
    }
});
