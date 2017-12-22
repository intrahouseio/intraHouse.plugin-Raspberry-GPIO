#!/usr/bin/python
# -*- coding: utf-8 -*-

# Import required libraries
import sys
import select
import string
import time
import RPi.GPIO as GPIO 
import datetime


# GPIO.cleanup()
GPIO.setwarnings(False)
# Use BCM GPIO references
# instead of physical pin numbers
GPIO.setmode(GPIO.BCM) 


def getPins( argstr ): 
	if len(argstr)>2:
		return dict([ a.split('=',1)  for a in argstr.split(',')])
	else:
		return {} 

		
def setupOutput(key):
#	sys.stdout.write('Setup OUT %s\n' % (key))
#	GPIO.cleanup(int(key))	
	GPIO.setup (int(key), GPIO.OUT) 
	GPIO.output(int(key), int(OutPins[key]))	
	sys.stdout.write('RPi?%i=%i\n' % (int(key),int(OutPins[key])))

	
def setupInput(key):
#	sys.stdout.write('Setup IN %s %s\n' % (key,  InPins[key]))
#	GPIO.cleanup(int(key))	
	pin = int(key)
	val=GPIO.PUD_UP  if InPins[key]=='U' else GPIO.PUD_DOWN
	GPIO.setup(pin, GPIO.IN, val)  
	InPins[key] = GPIO.input(pin)
	sys.stdout.write('RPi?%s=%i\n' % (key,InPins[key]))
	GPIO.add_event_detect(pin, GPIO.BOTH, callback= inputCallback)


def inputCallback(pin):
	val = GPIO.input(pin)		
	key = str(pin)
	InLast[key] = val
	tsInLast[key] = time.time()
	#sys.stdout.write('inputCallback %i %d\n' % (InLast[key],tsInLast[key]))

	#if ( InPins[key] != val ):
		#ts = time.time()
		# Input filter 40 ms
		#if ((tsInPins[key] == 0) or ((ts - tsInPins[key])*1000 > 20) ):
			#InPins[key] = val 
			#tsInPins[key] = ts
		
			#sys.stdout.write('RPi?%s=%i\n' % (key,val))
			#sys.stdout.flush()
	
	
def getCommands( instr ):
	str = instr[0:-1] if instr.endswith('&') else instr
	if str.find('&')>0:
		return dict([ a.split('=',1)  for a in str.split('&')])
	else:	
		return dict([ str.split('=',1) ])
		

#GPIO.cleanup()		
# Define GPIO signals to use
InPins  = getPins(sys.argv[1])
tsInPins = {}


#print  InPins
OutPins = getPins(sys.argv[2])
#print  OutPins

for key in OutPins.keys(): 
	setupOutput(key)
	
InLast = {}
tsInLast = {}
for key in InPins.keys(): 
	setupInput(key)
	InLast[key] = InPins[key]
	tsInLast[key] = 0
	
sys.stdout.flush()


# Start main loop
while True:

	#  async 
	i,o,e = select.select([sys.stdin],[],[],0.001)
	#i = select.select([sys.stdin],[],[],0.001)  # timeout: 0.0001 - CPU 30%,  0.001 - 5%, 0.01 - 0.5%
	#i = select.select([sys.stdin],[],[])     - так не работает read inputs, т.к. процесс подморожен
	
	ts = time.time()
	for key in InPins.keys(): 
		if (InPins[key] != InLast[key]):
			delta = (ts - tsInLast[key])*1000
			if (delta > 30):
				InPins[key] = InLast[key]

				#sys.stdout.write(' GET %d\n' % (delta))
				sys.stdout.write('RPi?%s=%i\n' % (key,InPins[key]))
				sys.stdout.flush()
		
	for s in i:
		if s == sys.stdin:
			input = sys.stdin.readline()
		
			# RPI?22=0001&23=0000&27=0001&/n
			commands = getCommands(input[4:-1])
			
			for key in commands.keys():
				pin = int(key)
				val = int(commands[key])
				
				GPIO.setup (pin, GPIO.OUT) 
				GPIO.output(pin, val)	
				sys.stdout.write('RPi?%i=%i\n' % (pin,val))
			
			sys.stdout.flush()
		
	
			
	
